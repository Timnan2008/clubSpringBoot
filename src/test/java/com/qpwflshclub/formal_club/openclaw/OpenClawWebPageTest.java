package com.qpwflshclub.formal_club.openclaw;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.InetAddress;
import java.net.URI;
import org.jsoup.Jsoup;
import org.junit.jupiter.api.Test;

class OpenClawWebPageTest {

    @Test
    void extractsArticleBodyNotScriptsAndNavigation() {
        String text = OpenClawWebPage.extract(
            Jsoup.parse(
                "<title>Test</title><nav>menu</nav><article><h1>研究正文</h1><p>第一段 &amp; 证据</p><p>第二段</p><script>secret()</script></article>"
            )
        );
        assertTrue(text.contains("第一段 & 证据"));
        assertTrue(text.contains("第二段"));
        assertFalse(text.contains("secret"));
        assertFalse(text.contains("menu"));
    }

    @Test
    void deniesPrivateMetadataAndRedirectTargets() throws Exception {
        for (String ip : new String[] {
            "127.0.0.1",
            "10.0.0.1",
            "172.16.0.1",
            "192.168.1.1",
            "169.254.169.254",
            "100.100.100.200",
            "0.0.0.0",
            "::1",
            "fc00::1",
            "fe80::1",
            "224.0.0.1",
        })
            assertFalse(OpenClawWebPage.publicAddress(InetAddress.getByName(ip)), ip);
        assertTrue(OpenClawWebPage.publicAddress(InetAddress.getByName("1.1.1.1")));
        for (String url : new String[] {
            "http://localhost/",
            "http://169.254.169.254/",
            "file:///etc/passwd",
            "https://user:pass@example.com/",
            "https://example.com:8088/",
        })
            assertThrows(Exception.class, () -> OpenClawWebPage.validateUri(URI.create(url)));
    }

    @Test
    void planValidationPreservesOrderAndActualStates() throws Exception {
        var json = new ObjectMapper();
        var tasks = OpenClawAgent.validatedTasks(
            json.readTree(
                "[{\"id\":\"1\",\"label\":\"阅读\",\"status\":\"done\"},{\"id\":\"2\",\"label\":\"总结\",\"status\":\"running\"}]"
            )
        );
        assertEquals(2, tasks.size());
        assertEquals("done", tasks.get(0).get("status"));
        assertThrows(IllegalArgumentException.class, () ->
            OpenClawAgent.validatedTasks(
                json.readTree("[{\"id\":\"1\",\"label\":\"x\",\"status\":\"fake\"}]")
            )
        );
    }
}
