# 生成自签名证书命令（仅供开发测试）
# keytool -genkeypair -alias qpwflshclub -keyalg RSA -keysize 2048 -storetype PKCS12 -keystore keystore.p12 -validity 3650 -storepass changeit -dname "CN=localhost,OU=Dev,O=QPWFLShClub,L=Shanghai,ST=Shanghai,C=CN"

# 说明：
# 1. 证书文件请放在 src/main/resources 目录下。
# 2. 生产环境请使用 CA 签发的正式证书，并妥善保管密码。
