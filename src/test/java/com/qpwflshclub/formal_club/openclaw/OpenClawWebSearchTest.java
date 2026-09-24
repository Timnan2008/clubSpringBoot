package com.qpwflshclub.formal_club.openclaw;

import static org.junit.jupiter.api.Assertions.*;

import java.nio.file.Files;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class OpenClawWebSearchTest {

    @Test
    void bingRedirectsResolveToActualReadableSourceUrls() {
        String encoded = java.util.Base64.getUrlEncoder()
            .withoutPadding()
            .encodeToString(
                "https://example.org/article".getBytes(java.nio.charset.StandardCharsets.UTF_8)
            );
        var hits = OpenClawWebSearch.parse(
            "<h2><a href=\"https://www.bing.com/ck/a?u=a1" + encoded + "\">Article</a></h2>"
        );
        assertEquals("https://example.org/article", hits.get(0).url());
    }

    @Test
    void publicResultsKeepTitlesAndDropPrivateHosts() {
        String html = """
        <a class="result__a" href="https://duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fa&amp;rut=1">Example</a>
        <a class="result__a" href="https://duckduckgo.com/l/?uddg=http%3A%2F%2F127.0.0.1%2Fsecret">Local</a>
        <a class="result__a" href="https://duckduckgo.com/l/?uddg=https%3A%2F%2F169.254.169.254%2F">Meta</a>
        """;
        List<Map<String, String>> sources = OpenClawWebSearch.cited(
            OpenClawWebSearch.format(OpenClawWebSearch.parse(html), false)
        );
        assertEquals(1, sources.size());
        assertEquals("Example", sources.get(0).get("title"));
        assertEquals("https://example.com/a", sources.get(0).get("url"));
        assertFalse(OpenClawWebSearch.publicHttp("http://10.1.2.3/a"));
        assertFalse(OpenClawWebSearch.publicHttp("https://localhost/a"));
    }

    @Test
    void bingHeadingsKeepPublicPagesAndDropSearchHosts() {
        String html = """
        <h2><a href="https://www.bing.com/ck/a?u=1">跳过</a></h2>
        <h2><a href="https://example.edu/school">青浦世外高级中学</a></h2>
        <h2><a href="http://127.0.0.1/secret">本地</a></h2>
        """;
        List<Map<String, String>> sources = OpenClawWebSearch.cited(
            OpenClawWebSearch.format(OpenClawWebSearch.parse(html), false)
        );
        assertEquals(1, sources.size());
        assertEquals("青浦世外高级中学", sources.get(0).get("title"));
        assertEquals("https://example.edu/school", sources.get(0).get("url"));
    }

    @Test
    void bingResultsIncludeUsefulSnippetsAndCitations() {
        String html = """
        <li class="b_algo"><h2><a href="https://example.edu/news"><strong>Club</strong> notice</a></h2>
          <div class="b_caption"><p class="b_lineclamp2">Meeting is on Friday &amp; sign-up is open.</p></div></li>
        """;
        String output = OpenClawWebSearch.format(OpenClawWebSearch.parse(html), true);
        assertTrue(output.contains("Meeting is on Friday & sign-up is open."));
        assertEquals("https://example.edu/news", OpenClawWebSearch.cited(output).get(0).get("url"));
    }

    @Test
    void preparedTextFileBelongsOnlyToThatAccount() throws Exception {
        var dir = Files.createTempDirectory("openclaw-files");
        var files = new OpenClawFiles(dir.toString());
        String output = files.give(7, "通知.md", "见面会在图书馆。", false);
        Map<String, String> cited = OpenClawFiles.cited(output);
        assertEquals("通知.md", cited.get("name"));
        String id = cited.get("href").substring("/api/openclaw/files/".length());
        assertNotNull(files.load(7, id));
        assertNull(files.load(8, id));
        assertNull(OpenClawFiles.safeName("../secret.sh"));
        assertEquals("名单.csv", OpenClawFiles.safeName("名单.csv"));
        assertEquals("通知.docx", OpenClawFiles.safeName("通知.docx"));
        assertEquals("club-plan.py", OpenClawFiles.safeName("club-plan.py"));
        assertNull(OpenClawFiles.safeName("club-plan.exe"));
    }

    @Test
    void wordDownloadAndOfficeText() throws Exception {
        var dir = Files.createTempDirectory("openclaw-office");
        var files = new OpenClawFiles(dir.toString());
        String output = files.give(7, "通知.docx", "见面会在图书馆。", false);
        Map<String, String> cited = OpenClawFiles.cited(output);
        assertEquals("通知.docx", cited.get("name"));
        String id = cited.get("href").substring("/api/openclaw/files/".length());
        byte[] saved = Files.readAllBytes(files.load(7, id).path());
        assertTrue(OpenClawOffice.extract("通知.docx", saved).contains("见面会在图书馆"));

        var slides = new java.io.ByteArrayOutputStream();
        try (var zip = new java.util.zip.ZipOutputStream(slides)) {
            zip.putNextEntry(new java.util.zip.ZipEntry("ppt/slides/slide1.xml"));
            zip.write(
                "<p:sld><a:t>社团例会</a:t></p:sld>".getBytes(
                    java.nio.charset.StandardCharsets.UTF_8
                )
            );
            zip.closeEntry();
        }
        assertTrue(OpenClawOffice.extract("例会.pptx", slides.toByteArray()).contains("社团例会"));
        assertNull(OpenClawOffice.extract("旧.doc", new byte[] { (byte) 0xD0, (byte) 0xCF, 1, 2 }));

        try (var pdf = new org.apache.pdfbox.pdmodel.PDDocument()) {
            var page = new org.apache.pdfbox.pdmodel.PDPage();
            pdf.addPage(page);
            try (var stream = new org.apache.pdfbox.pdmodel.PDPageContentStream(pdf, page)) {
                stream.beginText();
                stream.setFont(
                    new org.apache.pdfbox.pdmodel.font.PDType1Font(
                        org.apache.pdfbox.pdmodel.font.Standard14Fonts.FontName.HELVETICA
                    ),
                    12
                );
                stream.newLineAtOffset(50, 700);
                stream.showText("Campus notice");
                stream.endText();
            }
            var bytes = new java.io.ByteArrayOutputStream();
            pdf.save(bytes);
            assertTrue(
                OpenClawOffice.extract("notice.pdf", bytes.toByteArray()).contains("Campus notice")
            );
        }
    }
}
