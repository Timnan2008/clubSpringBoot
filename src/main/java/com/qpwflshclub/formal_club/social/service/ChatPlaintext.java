package com.qpwflshclub.formal_club.social.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.*;
import java.util.*;
import javax.crypto.*;
import javax.crypto.spec.*;
import org.springframework.stereotype.Service;

/**
 * 私信明文检查用的解密器。
 *
 * <p>背景：私信是端到端加密的（ECDH P-256 + HKDF-SHA256 + AES-GCM，payload 形如
 * <code>e2ee:v1:{...}</code>），服务器默认只看到密文，所以「发违禁词不会被拦」。
 * 但服务器的密钥托管（{@link MessageRecovery}）本来就保存着账号的加密私钥（用户自己也能取回），
 * 因此这里用同样的算法把新消息解出来，交给 {@link ModerationGate} 检查。
 *
 * <p>算法必须和前端 frontend/message-crypto.js 完全一致：
 * <pre>
 *   secret = ECDH(发送方私钥, 接收方公钥)                    // 32 字节
 *   info   = "qpwfl-message-v1|发送方id|接收方id|发送方指纹|接收方指纹"
 *   key    = HKDF-SHA256(ikm=secret, salt=iv, info=info, 32)
 *   text   = AES-256-GCM 解密(ciphertext, iv, AAD=info)
 * </pre>
 *
 * <p>安全设计：**任何失败都返回 null**（解不开就不检查），绝不因为解密问题打断或拒收私信。
 */
@Service
public class ChatPlaintext {

    private static final String PREFIX = "e2ee:v1:";

    private final ObjectMapper json;
    private final MessageKeys keys;
    private final MessageRecovery recovery;

    public ChatPlaintext(ObjectMapper json, MessageKeys keys, MessageRecovery recovery) {
        this.json = json;
        this.keys = keys;
        this.recovery = recovery;
    }

    /** 这条 payload 是不是加密私信。 */
    public static boolean isEncrypted(String payload) {
        return payload != null && payload.startsWith(PREFIX);
    }

    /**
     * 尝试解出私信明文（只为违禁词检查，不落盘、不外传）。
     *
     * @return 明文；解不开（密钥缺失、格式不对、被篡改）返回 null
     */
    public String decrypt(String senderId, String recipientId, String payload) {
        if (!isEncrypted(payload) || senderId == null || recipientId == null) return null;
        try {
            var e = json.readTree(payload.substring(PREFIX.length()));
            if (e.path("v").asInt() != 1) return null;
            String senderFingerprint = e.path("senderKey").asText();
            String recipientFingerprint = e.path("recipientKey").asText();
            byte[] iv = Base64.getDecoder().decode(e.path("iv").asText());
            byte[] ciphertext = Base64.getDecoder().decode(e.path("ciphertext").asText());
            if (iv.length != 12 || ciphertext.length < 17 || ciphertext.length > 11016) return null;

            var sender = recovery.get(senderId); // 发送方身份（含私钥）
            var recipient = keys.get(recipientId); // 接收方公钥
            if (sender == null || recipient == null) return null;
            if (!fingerprintOf(sender.publicKey()).equals(senderFingerprint)) return null;
            if (!recipient.fingerprint().equals(recipientFingerprint)) return null;

            byte[] info = (
                "qpwfl-message-v1|" +
                senderId +
                "|" +
                recipientId +
                "|" +
                senderFingerprint +
                "|" +
                recipientFingerprint
            ).getBytes(StandardCharsets.UTF_8);
            byte[] seed = sharedSecret(sender.privateKey(), recipient.publicKey());
            byte[] key = hkdfSha256(seed, iv, info, 32);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
            cipher.updateAAD(info);
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (Throwable ignored) {
            return null; // 解不开就当没检查：绝不打断私信功能
        }
    }

    /** ECDH：拿自己的私钥和对端公钥算出共享秘密（两个方向结果相同）。 */
    private static byte[] sharedSecret(String privateKeyB64, String publicKeyB64) throws Exception {
        KeyFactory factory = KeyFactory.getInstance("EC");
        PrivateKey own = factory.generatePrivate(
            new PKCS8EncodedKeySpec(Base64.getDecoder().decode(privateKeyB64))
        );
        PublicKey peer = factory.generatePublic(
            new X509EncodedKeySpec(Base64.getDecoder().decode(publicKeyB64))
        );
        KeyAgreement agreement = KeyAgreement.getInstance("ECDH");
        agreement.init(own);
        agreement.doPhase(peer, true);
        return agreement.generateSecret();
    }

    /** HKDF-SHA256（RFC 5869），输出 32 字节 = 单块展开。 */
    private static byte[] hkdfSha256(byte[] ikm, byte[] salt, byte[] info, int length) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(salt != null && salt.length > 0 ? salt : new byte[32], "HmacSHA256"));
        byte[] prk = mac.doFinal(ikm);
        mac.init(new SecretKeySpec(prk, "HmacSHA256"));
        mac.update(info);
        mac.update((byte) 1);
        return Arrays.copyOf(mac.doFinal(), length);
    }

    private static String fingerprintOf(String publicKeyB64) throws Exception {
        return HexFormat.of().formatHex(
            MessageDigest.getInstance("SHA-256").digest(Base64.getDecoder().decode(publicKeyB64))
        );
    }
}
