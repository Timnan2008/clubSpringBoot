package com.qpwflshclub.formal_club.Booking.service;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.zip.*;

/** Minimal XLSX writer so booking exports stay in-process without Apache POI. */
final class BookingWorkbook {

    record Line(List<String> cells) {}

    private BookingWorkbook() {}

    static byte[] write(String sheet, List<String> headers, List<Line> rows) {
        try (var bytes = new ByteArrayOutputStream(); var zip = new ZipOutputStream(bytes)) {
            put(
                zip,
                "[Content_Types].xml",
                """
                <?xml version="1.0" encoding="UTF-8"?>
                <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
                  <Default Extension="xml" ContentType="application/xml"/>
                  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
                  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
                  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
                </Types>
                """
            );
            put(
                zip,
                "_rels/.rels",
                """
                <?xml version="1.0" encoding="UTF-8"?>
                <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
                  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
                </Relationships>
                """
            );
            put(
                zip,
                "xl/_rels/workbook.xml.rels",
                """
                <?xml version="1.0" encoding="UTF-8"?>
                <Relationships xmlns="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
                  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
                  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
                </Relationships>
                """
            );
            put(
                zip,
                "xl/workbook.xml",
                """
                <?xml version="1.0" encoding="UTF-8"?>
                <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
                  <sheets><sheet name="%s" sheetId="1" r:id="rId1"/></sheets>
                </workbook>
                """.formatted(xml(sheet))
            );
            put(
                zip,
                "xl/styles.xml",
                """
                <?xml version="1.0" encoding="UTF-8"?>
                <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
                  <fonts count="2">
                    <font><sz val="11"/><name val="Arial"/></font>
                    <font><b/><sz val="11"/><name val="Arial"/></font>
                  </fonts>
                  <fills count="2"><fill/><fill><patternFill patternType="gray125"/></fill></fills>
                  <borders count="1"><border/></borders>
                  <cellXfs count="2">
                    <xf fontId="0" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf>
                    <xf fontId="1" applyFont="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf>
                  </cellXfs>
                </styleSheet>
                """
            );
            put(zip, "xl/worksheets/sheet1.xml", sheetXml(headers, rows));
            zip.finish();
            return bytes.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException("Cannot write booking workbook", e);
        }
    }

    private static void put(ZipOutputStream zip, String name, String xml) throws Exception {
        zip.putNextEntry(new ZipEntry(name));
        zip.write(xml.getBytes(StandardCharsets.UTF_8));
        zip.closeEntry();
    }

    private static String sheetXml(List<String> headers, List<Line> rows) {
        int columns = headers.size();
        for (Line row : rows) columns = Math.max(columns, row.cells().size());
        double[] widths = new double[Math.max(columns, 1)];
        for (int i = 0; i < widths.length; i++) widths[i] = 12;
        widen(widths, headers);
        for (Line row : rows) widen(widths, row.cells());
        String last = column(Math.max(columns, 1) - 1) + (1 + rows.size());
        StringBuilder xml = new StringBuilder(
            """
            <?xml version="1.0" encoding="UTF-8"?>
            <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
            <dimension ref="A1:%s"/>
            <sheetViews>
              <sheetView workbookViewId="0">
                <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
              </sheetView>
            </sheetViews>
            <sheetFormatPr defaultRowHeight="20" defaultColWidth="12"/>
            <cols>
            """.formatted(last)
        );
        for (int i = 0; i < widths.length; i++) {
            xml.append("<col min=\"")
                .append(i + 1)
                .append("\" max=\"")
                .append(i + 1)
                .append("\" width=\"")
                .append(String.format(Locale.US, "%.2f", widths[i]))
                .append("\" customWidth=\"1\"/>");
        }
        xml.append("</cols><sheetData>");
        xml.append(rowXml(1, headers, true));
        int index = 2;
        for (Line row : rows) xml.append(rowXml(index++, row.cells(), false));
        xml.append("</sheetData></worksheet>");
        return xml.toString();
    }

    private static void widen(double[] widths, List<String> cells) {
        for (int i = 0; i < cells.size() && i < widths.length; i++) {
            widths[i] = Math.max(widths[i], displayWidth(cells.get(i)));
        }
    }

    static double displayWidth(String value) {
        String text = value == null ? "" : value;
        double width = 4;
        for (int i = 0; i < text.length(); ) {
            int cp = text.codePointAt(i);
            i += Character.charCount(cp);
            width += cp > 0x2E80 ? 2.5 : 1.3;
        }
        return Math.min(56, Math.max(12, width));
    }

    private static String rowXml(int index, List<String> cells, boolean header) {
        StringBuilder xml = new StringBuilder("<row r=\"").append(index).append("\">");
        for (int i = 0; i < cells.size(); i++) {
            xml.append("<c r=\"")
                .append(column(i))
                .append(index)
                .append("\" t=\"inlineStr\" s=\"")
                .append(header ? "1" : "0")
                .append("\"><is><t xml:space=\"preserve\">")
                .append(xml(cells.get(i)))
                .append("</t></is></c>");
        }
        return xml.append("</row>").toString();
    }

    private static String column(int index) {
        StringBuilder name = new StringBuilder();
        int value = index;
        do {
            name.insert(0, (char) ('A' + (value % 26)));
            value = value / 26 - 1;
        } while (value >= 0);
        return name.toString();
    }

    private static String xml(String value) {
        String text = value == null ? "" : value;
        return text
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("\u0000", "");
    }
}
