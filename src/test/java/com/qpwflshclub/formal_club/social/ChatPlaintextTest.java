package com.qpwflshclub.formal_club.social;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.qpwflshclub.formal_club.social.service.ChatPlaintext;
import com.qpwflshclub.formal_club.social.service.MessageKeys;
import com.qpwflshclub.formal_club.social.service.MessageRecovery;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.MessageDigest;
import java.security.spec.ECGenParameterSpec;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;
import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * 私信服务端解密（违禁词检查用）的回归测试（第三十四轮补）。
 *
 * <p>这段代码负责把浏览器加密的私信在服务端解出明文、**只用于违禁词检查**。它最要紧的两条契约：
 *
 * <ol>
 *   <li><b>解得出</b>：测试里用一份独立实现的「客户端算法」（ECDH → HKDF-SHA256 → AES-GCM，
 *       AAD 绑定双方账号与密钥指纹）自己加密，再交给服务端解 —— 两边对得上，说明服务端实现没错；</li>
 *   <li><b>解不开就安静地返回 null</b>：明文、半截 JSON、版本不对、IV 长度不对、密文被改、
 *       指纹不匹配、换收件人、密钥缺失 —— 一律返回 null，**绝不抛异常**，否则私信功能会被打断。</li>
 * </ol>
 */
class ChatPlaintextTest {

    private static final String SENDER = "1".repeat(64);
    private static final String RECIPIENT = "2".repeat(64);
    private static final String TEXT = "今晚八点老地方见，别迟到。";

    private final ObjectMapper json = new ObjectMapper();

    private KeyPair senderPair;
    private KeyPair recipientPair;
    private String senderPub;
    private String senderPriv;
    private String recipientPub;
    private String senderFingerprint;
    private String recipientFingerprint;

    private ChatPlaintext chat;
    private MessageKeys keys;
    private MessageRecovery recovery;

    @BeforeEach
    void setup() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("EC");
        generator.initialize(new ECGenParameterSpec("secp256r1"));
        senderPair = generator.generateKeyPair();
        recipientPair = generator.generateKeyPair();

        senderPub = base64(senderPair.getPublic().getEncoded());
        senderPriv = base64(senderPair.getPrivate().getEncoded());
        recipientPub = base64(recipientPair.getPublic().getEncoded());
        senderFingerprint = fingerprint(senderPub);
        recipientFingerprint = fingerprint(recipientPub);

        keys = mock(MessageKeys.class);
        recovery = mock(MessageRecovery.class);
        when(keys.get(RECIPIENT)).thenReturn(
            new MessageKeys.PublicKeyInfo(recipientPub, recipientFingerprint)
        );
        when(keys.get(SENDER)).thenReturn(
            new MessageKeys.PublicKeyInfo(senderPub, senderFingerprint)
        );
        when(recovery.get(SENDER)).thenReturn(
            new MessageRecovery.Identity(senderPub, senderPriv)
        );
        chat = new ChatPlaintext(json, keys, recovery);
    }

    // ---------------------------------------------------------------- 客户端侧算法（测试里独立实现）

    private static String base64(byte[] bytes) {
        return Base64.getEncoder().encodeToString(bytes);
    }

    private static String fingerprint(String publicKeyB64) throws Exception {
        return HexFormat.of().formatHex(
            MessageDigest.getInstance("SHA-256").digest(Base64.getDecoder().decode(publicKeyB64))
        );
    }

    /** HKDF-SHA256（RFC 5869）单块展开，与服务端一致。 */
    private static byte[] hkdf(byte[] ikm, byte[] salt, byte[] info, int length) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(salt != null && salt.length > 0 ? salt : new byte[32], "HmacSHA256"));
        byte[] prk = mac.doFinal(ikm);
        mac.init(new SecretKeySpec(prk, "HmacSHA256"));
        mac.update(info);
        mac.update((byte) 1);
        return Arrays.copyOf(mac.doFinal(), length);
    }

    /** 站在「接收方」这一侧加密：ECDH(自己私钥 × 对方公钥) 与发送方算出来的是同一个秘密。 */
    private byte[] sharedSecret() throws Exception {
        KeyAgreement agreement = KeyAgreement.getInstance("ECDH");
        agreement.init(recipientPair.getPrivate());
        agreement.doPhase(senderPair.getPublic(), true);
        return agreement.generateSecret();
    }

    private byte[] info(byte[] iv, String senderKey, String recipientKey) {
        return (
            "qpwfl-message-v1|" + SENDER + "|" + RECIPIENT + "|" + senderKey + "|" + recipientKey
        ).getBytes(StandardCharsets.UTF_8);
    }

    private static byte[] iv() {
        byte[] value = new byte[12];
        new java.security.SecureRandom().nextBytes(value);
        return value;
    }

    /** 按客户端约定生成 payload（可顺手把密文改一个 bit 用于「篡改」场景）。 */
    private String payload(String text, byte[] iv, String senderKey, String recipientKey,
                           boolean tamper) throws Exception {
        byte[] info = info(iv, senderKey, recipientKey);
        byte[] key = hkdf(sharedSecret(), iv, info, 32);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
        cipher.updateAAD(info);
        byte[] out = cipher.doFinal(text.getBytes(StandardCharsets.UTF_8));
        if (tamper) {
            out[0] ^= 0x01;
        }
        return wrap(out, iv, senderKey, recipientKey);
    }

    private String wrap(byte[] ciphertext, byte[] iv, String senderKey, String recipientKey)
        throws Exception {
        ObjectNode node = json.createObjectNode();
        node.put("v", 1);
        node.put("senderKey", senderKey);
        node.put("recipientKey", recipientKey);
        node.put("iv", base64(iv));
        node.put("ciphertext", base64(ciphertext));
        return "e2ee:v1:" + json.writeValueAsString(node);
    }

    // ---------------------------------------------------------------- 正常解密

    @Test
    void decryptsWhatTheClientSideAlgorithmEncrypted() throws Exception {
        String payload = payload(TEXT, iv(), senderFingerprint, recipientFingerprint, false);
        assertThat(ChatPlaintext.isEncrypted(payload)).isTrue();
        assertThat(chat.decrypt(SENDER, RECIPIENT, payload)).isEqualTo(TEXT);
    }

    // ---------------------------------------------------------------- 解不开时必须安静返回 null

    @Test
    void tamperedCiphertextIsRejected() throws Exception {
        String payload = payload(TEXT, iv(), senderFingerprint, recipientFingerprint, true);
        assertThat(chat.decrypt(SENDER, RECIPIENT, payload)).isNull();
    }

    @Test
    void keyFingerprintsMustMatchThePayload() throws Exception {
        // payload 里写的收件人指纹和服务器记录的不一致 → 直接拒
        String payload = payload(TEXT, iv(), senderFingerprint, senderFingerprint, false);
        assertThat(chat.decrypt(SENDER, RECIPIENT, payload)).isNull();
    }

    @Test
    void idsAreBoundIntoTheKeyDerivation() throws Exception {
        byte[] iv = iv();
        // 用「交换过的双方账号」当 AAD 加密：密钥派生与 AAD 都变了，服务端必须解不开
        byte[] swapped = (
            "qpwfl-message-v1|" + RECIPIENT + "|" + SENDER + "|" + senderFingerprint + "|"
                + recipientFingerprint
        ).getBytes(StandardCharsets.UTF_8);
        byte[] key = hkdf(sharedSecret(), iv, swapped, 32);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
        cipher.updateAAD(swapped);
        byte[] out = cipher.doFinal(TEXT.getBytes(StandardCharsets.UTF_8));
        assertThat(chat.decrypt(SENDER, RECIPIENT, wrap(out, iv, senderFingerprint, recipientFingerprint)))
            .isNull();
    }

    @Test
    void malformedPayloadsReturnNullInsteadOfThrowing() throws Exception {
        assertThat(chat.decrypt(SENDER, RECIPIENT, null)).isNull();
        assertThat(chat.decrypt(SENDER, RECIPIENT, "今晚八点见")).isNull();
        assertThat(chat.decrypt(SENDER, RECIPIENT, "e2ee:v1:not-json")).isNull();
        assertThat(chat.decrypt(SENDER, RECIPIENT, "e2ee:v1:{}")).isNull();
        assertThat(chat.decrypt(null, RECIPIENT, "e2ee:v1:{}")).isNull();
        assertThat(chat.decrypt(
            SENDER, RECIPIENT, "e2ee:v1:" + json.writeValueAsString(json.createObjectNode().put("v", 2))
        )).isNull();
    }

    @Test
    void wrongIvLengthOrShortCiphertextIsRejected() throws Exception {
        byte[] sixteen = new byte[16];
        new java.security.SecureRandom().nextBytes(sixteen);
        assertThat(chat.decrypt(SENDER, RECIPIENT,
            wrap(new byte[40], sixteen, senderFingerprint, recipientFingerprint))).isNull();
        assertThat(chat.decrypt(SENDER, RECIPIENT,
            wrap(new byte[8], iv(), senderFingerprint, recipientFingerprint))).isNull();
    }

    @Test
    void missingKeysReturnNull() throws Exception {
        String payload = payload(TEXT, iv(), senderFingerprint, recipientFingerprint, false);
        when(keys.get(RECIPIENT)).thenReturn(null);
        assertThat(chat.decrypt(SENDER, RECIPIENT, payload)).isNull();

        when(keys.get(RECIPIENT)).thenReturn(
            new MessageKeys.PublicKeyInfo(recipientPub, recipientFingerprint)
        );
        when(recovery.get(SENDER)).thenReturn(null);
        assertThat(chat.decrypt(SENDER, RECIPIENT, payload)).isNull();
    }

    @Test
    void onlyE2eePayloadsAreTreatedAsEncrypted() {
        assertThat(ChatPlaintext.isEncrypted("e2ee:v1:{}")).isTrue();
        assertThat(ChatPlaintext.isEncrypted("普通明文")).isFalse();
        assertThat(ChatPlaintext.isEncrypted(null)).isFalse();
    }
}
