const {app,BrowserWindow,ipcMain,session,Menu}=require('electron');
const path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const {PRODUCTION,LOCAL}=require('./policy.cjs');
const {createClient}=require('./client.cjs');
if(!app.isPackaged)app.setPath('userData',path.join(__dirname,'..','.local',process.env.CLUB_QA?'qa-profile':'profile'));
let mainWindow,serverName='production';
const base=()=>serverName==='local'?LOCAL:PRODUCTION;
const remoteSession=()=>session.fromPartition(`persist:club-${serverName}`);
const indexPath=path.join(__dirname,'..','dist','index.html');
const localURL=pathToFileURL(indexPath).href;
const client=createClient((route,options)=>remoteSession().fetch(base()+route,options));
function trusted(event){if(!mainWindow||event.sender!==mainWindow.webContents||event.senderFrame!==mainWindow.webContents.mainFrame||event.senderFrame.url!==localURL)throw Error('请求来源不受信任')}
function notify(){if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('club:session-changed')}
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 920,
    minHeight: 680,
    title: "青浦世外社团",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 20, y: 18 },
    backgroundColor: "#10101b",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  mainWindow.webContents.on("will-navigate", (event) => event.preventDefault());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.loadFile(indexPath);
}
app.whenReady().then(()=>{
 const preferences=path.join(app.getPath('userData'),'server.json');
 try{if(JSON.parse(fs.readFileSync(preferences)).server==='local')serverName='local'}catch{}
 for(const name of ['production','local']){const s=session.fromPartition(`persist:club-${name}`);s.setPermissionRequestHandler((_c,_p,cb)=>cb(false));s.setPermissionCheckHandler(()=>false);s.on('will-download',(_e,item)=>item.cancel())}
 ipcMain.handle('club:info',e=>{trusted(e);return {version:app.getVersion(),platform:process.platform,server:serverName,baseURL:base()}});
 ipcMain.handle('club:read',(e,key,input)=>{trusted(e);return client.read(key,input)});
 ipcMain.handle('club:write',async(e,key,input)=>{trusted(e);const result=await client.write(key,input);if(key==='login'&&result.ok)notify();return result});
 ipcMain.handle('club:server',(e,value)=>{trusted(e);if(!['local','production'].includes(value))throw Error('无效服务器');client.invalidate();serverName=value;fs.mkdirSync(app.getPath('userData'),{recursive:true});fs.writeFileSync(preferences,JSON.stringify({server:value}));notify();return true});
 ipcMain.handle('club:logout',async e=>{trusted(e);await client.logout();await remoteSession().clearStorageData();notify();return true});
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: "青浦世外社团",
        submenu: [
          { role: "about" },
          { type: "separator" },
          { role: "hide" },
          { role: "hideOthers" },
          { type: "separator" },
          { role: "quit" },
        ],
      },
      { role: "editMenu" },
      { role: "viewMenu" },
      { role: "windowMenu" },
    ]),
  );
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
