from pathlib import Path
import hashlib,json,subprocess,datetime,argparse,shlex
parser=argparse.ArgumentParser(description="Upload and atomically replace the main site JAR with backup and rollback.")
parser.add_argument("--host",required=True,help="SSH destination such as root@your-server")
parser.add_argument("--identity",help="Optional SSH private key path; never commit the key")
args=parser.parse_args()
R=Path(__file__).resolve().parents[1]
release=datetime.datetime.now().strftime('%Y%m%d-%H%M%S')+'-site-release'
ssh=['ssh','-o','BatchMode=yes','-o','ConnectTimeout=10','-o','ServerAliveInterval=10','-o','ServerAliveCountMax=3']+(['-i',args.identity] if args.identity else [])+[args.host]
jar=R/'target/formal_club-0.0.1-SNAPSHOT.jar'
cfg={'release':release,'old':subprocess.check_output(ssh+['sha256sum','/opt/club-app/formal_club3.0.jar'],text=True).split()[0],'new':hashlib.sha256(jar.read_bytes()).hexdigest()}
stage='/opt/club-app/staging/'+release

subprocess.run(ssh+['mkdir','-p',stage],check=True)
subprocess.run(ssh+['cp','/opt/club-app/formal_club3.0.jar',stage+'/app.jar'],check=True)
for attempt in range(3):
 result=subprocess.run(['rsync','-acz','--inplace','--timeout=45','-e',shlex.join(ssh[:-1]),str(jar),args.host+':'+stage+'/app.jar'])
 check=subprocess.run(ssh+['sha256sum',stage+'/app.jar'],capture_output=True,text=True)
 if check.returncode==0 and check.stdout.split()[0]==cfg['new']:break
else:raise RuntimeError('Upload incomplete; staged jar retained')

remote='''from pathlib import Path
import subprocess,hashlib,json,shutil,time,urllib.request,os
jar=Path('/opt/club-app/formal_club3.0.jar');staged=Path('/opt/club-app/staging')/cfg['release']/'app.jar';backup=Path('/opt/club-app/backups')/cfg['release']
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(jar)==cfg['old'],'Production version changed'
assert sha(staged)==cfg['new'],'Upload mismatch'
subprocess.run(['systemctl','is-active','--quiet','club-app','nginx'],check=True)
backup.mkdir();os.chmod(backup,0o700);shutil.copy2(jar,backup/jar.name)
shutil.make_archive(str(backup/'private-data'),'gztar','/opt/club-app/data');os.chmod(backup/'private-data.tar.gz',0o600)
appearance=Path('/opt/club-app/data/accounts/appearance/settings.json')
if appearance.exists():shutil.copy2(appearance,backup/'appearance-settings.json')
for name in ['campus-social/social.json','campus-social/notifications.json','accounts/session-revocations.json']:
 source=Path('/opt/club-app/data')/name
 if source.exists():shutil.copy2(source,backup/name.replace('/','-'))
aliases=Path('/opt/club-app/data/accounts/login-emails.json');aliases_sha=sha(aliases)
def ready():
 for _ in range(100):
  try:
   with urllib.request.urlopen('http://127.0.0.1:8088/api/club/all',timeout=2) as r:data=json.load(r)
   if data.get('code')==200 and len(data.get('data',[]))>=43:return
  except Exception:pass
  time.sleep(1)
 raise RuntimeError('Readiness timed out')
try:
 os.replace(staged,jar);os.chmod(jar,0o644);subprocess.run(['systemctl','restart','club-app'],check=True)
 print('Application restarted; waiting for readiness',flush=True);ready()
 assert sha(jar)==cfg['new'];assert sha(aliases)==aliases_sha
 subprocess.run(['systemctl','is-active','--quiet','club-app','nginx'],check=True)
 print(json.dumps({'ready':True,'release':cfg['release'],'backup':str(backup),'loginAliasesPreserved':True,'noSchemaChange':True}),flush=True)
except BaseException:
 shutil.copy2(backup/jar.name,jar);subprocess.run(['systemctl','restart','club-app'],check=True);ready();print('Restored previous release',flush=True);raise
'''
subprocess.run(ssh+['python3','-'],input='cfg='+repr(cfg)+'\n'+remote,text=True,check=True)
print(json.dumps(cfg,indent=2))
