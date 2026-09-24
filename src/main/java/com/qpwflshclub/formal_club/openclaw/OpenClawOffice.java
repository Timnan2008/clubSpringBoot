package com.qpwflshclub.formal_club.openclaw;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;

/** Campus notices as Word, and text pulled out of uploaded office files. */
final class OpenClawOffice {

    private static final int MAX_BYTES = 12_000_000;
    private static final Pattern DOCX_TEXT = Pattern.compile("<w:t(?:\\s[^>]*)?>([^<]*)</w:t>");
    private static final Pattern PPTX_TEXT = Pattern.compile("<a:t(?:\\s[^>]*)?>([^<]*)</a:t>");

    private OpenClawOffice() {}

    static byte[] word(String text) throws IOException {
        String body = text == null ? "" : text;
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(bytes)) {
            entry(
                zip,
                "[Content_Types].xml",
                """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
                  <Default Extension="xml" ContentType="application/xml"/>
                  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
                </Types>
                """
            );
            entry(
                zip,
                "_rels/.rels",
                """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
                </Relationships>
                """
            );
            entry(
                zip,
                "word/_rels/document.xml.rels",
                """
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>
                """
            );
            entry(zip, "word/document.xml", documentXml(body));
        }
        return bytes.toByteArray();
    }

    /** Text from docx, pptx, or pdf. Null means the old binary format cannot be read. */
    static String extract(String name, byte[] data) {
        if (name == null || data == null || data.length == 0 || data.length > MAX_BYTES) return "";
        String lower = name.toLowerCase(Locale.ROOT);
        try {
            if (lower.endsWith(".docx")) return docxText(data);
            if (lower.endsWith(".pptx")) return pptxText(data);
            if (lower.endsWith(".pdf")) return pdfText(data);
            if (lower.endsWith(".doc") || lower.endsWith(".ppt")) {
                if (!isZip(data)) return null;
                return lower.endsWith(".ppt") ? pptxText(data) : docxText(data);
            }
        } catch (IOException e) {
            return "";
        }
        return "";
    }

    private static String documentXml(String text) {
        StringBuilder paragraphs = new StringBuilder();
        String[] lines = text.split("\\n", -1);
        int count = 0;
        for (String line : lines) {
            if (count++ > 500) break;
            paragraphs
                .append(
                    "<w:p><w:r><w:rPr><w:rFonts w:ascii=\"Calibri\" w:hAnsi=\"Calibri\" w:eastAsia=\"Microsoft YaHei\"/></w:rPr><w:t xml:space=\"preserve\">"
                )
                .append(xml(line))
                .append("</w:t></w:r></w:p>");
        }
        return (
            """
            <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
            <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
              <w:body>
            """ +
            paragraphs +
            """
                <w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>
              </w:body>
            </w:document>
            """
        );
    }

    private static String docxText(byte[] data) throws IOException {
        return xmlText(data, "word/document.xml", DOCX_TEXT);
    }

    private static String pptxText(byte[] data) throws IOException {
        return xmlText(data, "ppt/slides/slide", PPTX_TEXT);
    }

    private static String xmlText(byte[] data, String marker, Pattern pattern) throws IOException {
        StringBuilder out = new StringBuilder();
        int total = 0;
        try (ZipInputStream zip = new ZipInputStream(new ByteArrayInputStream(data))) {
            ZipEntry entry;
            int files = 0;
            while ((entry = zip.getNextEntry()) != null) {
                if (entry.isDirectory() || ++files > 40) continue;
                String path = entry.getName().replace('\\', '/');
                if (path.contains("..") || !path.startsWith(marker)) continue;
                byte[] xml = readLimited(zip, 2_000_000);
                total += xml.length;
                if (total > 6_000_000) break;
                Matcher matcher = pattern.matcher(new String(xml, StandardCharsets.UTF_8));
                while (matcher.find()) {
                    if (out.length() > 30_000) return out.toString();
                    if (!out.isEmpty()) out.append('\n');
                    out.append(unescape(matcher.group(1)));
                }
            }
        }
        return out.toString();
    }

    private static String pdfText(byte[] data) throws IOException {
        try (PDDocument document = Loader.loadPDF(data)) {
            if (document.isEncrypted()) return "";
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            stripper.setEndPage(Math.min(document.getNumberOfPages(), 20));
            String text = stripper.getText(document);
            return text == null ? "" : text;
        }
    }

    private static byte[] readLimited(ZipInputStream zip, int max) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int read;
        while ((read = zip.read(buffer)) >= 0) {
            if (out.size() + read > max) break;
            out.write(buffer, 0, read);
        }
        return out.toByteArray();
    }

    private static boolean isZip(byte[] data) {
        return data.length > 3 && data[0] == 'P' && data[1] == 'K';
    }

    private static void entry(ZipOutputStream zip, String name, String xml) throws IOException {
        zip.putNextEntry(new ZipEntry(name));
        zip.write(xml.getBytes(StandardCharsets.UTF_8));
        zip.closeEntry();
    }

    private static String xml(String text) {
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            if (c == '&') out.append("&amp;");
            else if (c == '<') out.append("&lt;");
            else if (c == '>') out.append("&gt;");
            else if (c == '"') out.append("&quot;");
            else if (c < 0x20 && c != '\t') continue;
            else out.append(c);
        }
        return out.toString();
    }

    private static String unescape(String text) {
        return text
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&apos;", "'")
            .replace("&amp;", "&");
    }
}
