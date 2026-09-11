package com.qpwflshclub.formal_club.config;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

/** Accept the legacy format while supporting salted hashes for newly provisioned accounts. */
public final class PasswordCodec {
    private PasswordCodec() {}
    public static String encode(String input) {
        try {
            byte[] salt=new byte[16];new java.security.SecureRandom().nextBytes(salt);
            PBEKeySpec spec=new PBEKeySpec(input.toCharArray(),salt,600000,256);
            try {return "pbkdf2-sha256$600000$"+Base64.getEncoder().encodeToString(salt)+"$"+Base64.getEncoder().encodeToString(SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded());}
            finally {spec.clearPassword();}
        } catch (Exception e) {throw new IllegalStateException("Password hashing unavailable",e);}
    }
    public static boolean matches(String stored, String input) {
        if (stored == null || input == null || input.length() > 1024) return false;
        if (!stored.startsWith("pbkdf2-sha256$"))
            return MessageDigest.isEqual(stored.getBytes(StandardCharsets.UTF_8),input.getBytes(StandardCharsets.UTF_8));
        try {
            String[] parts=stored.split("\\$");
            if(parts.length!=4) return false;
            int iterations=Integer.parseInt(parts[1]);
            if(iterations<100000 || iterations>1000000) return false;
            byte[] salt=Base64.getDecoder().decode(parts[2]), expected=Base64.getDecoder().decode(parts[3]);
            if(salt.length<16 || expected.length!=32) return false;
            PBEKeySpec spec=new PBEKeySpec(input.toCharArray(),salt,iterations,256);
            try { return MessageDigest.isEqual(expected,SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded()); }
            finally { spec.clearPassword(); }
        } catch(Exception e) { return false; }
    }
}
