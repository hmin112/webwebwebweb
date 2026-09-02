package kr.co.devsign.devsign_backend.util;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import kr.co.devsign.devsign_backend.dto.assembly.PlanBudgetItemDto;
import kr.co.devsign.devsign_backend.dto.assembly.PlanRoleDto;
import kr.co.devsign.devsign_backend.dto.assembly.PlanTaskDto;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.List;

// 총회 계획서(PLAN)를 웹에서 작성한 내용을 관리자 ZIP 다운로드용 PDF로 변환.
// 한글이 어떤 뷰어에서도 깨지지 않도록, 시스템 폰트에 의존하지 않고 한글 서브셋 폰트(NotoSansKR)를
// 직접 리소스로 번들해 PDF 안에 임베드한다.
@Component
public class PlanPdfGenerator {

    private static final String FONT_RESOURCE = "/fonts/NotoSansKR.ttf";
    private static final float[] TASK_WIDTHS = {3f, 2f, 1.5f};
    private static final float[] ROLE_WIDTHS = {1.5f, 1.5f, 3f};
    private static final float[] BUDGET_WIDTHS = {2.5f, 1.5f, 2.5f};

    public byte[] generate(String title, String author, String date, String planOverview,
                            List<String> planGoals, List<PlanTaskDto> planTasks,
                            List<PlanRoleDto> planRoles, List<PlanBudgetItemDto> planBudgetItems,
                            String planNotes) {
        try {
            Font titleFont = loadFont(20, Font.BOLD);
            Font headingFont = loadFont(13, Font.BOLD);
            Font bodyFont = loadFont(11, Font.NORMAL);
            Font metaFont = loadFont(10, Font.NORMAL);
            Font tableHeaderFont = loadFont(10, Font.BOLD);
            Font tableBodyFont = loadFont(10, Font.NORMAL);

            Document document = new Document(PageSize.A4, 50, 50, 50, 50);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            PdfWriter.getInstance(document, out);
            document.open();

            document.add(new Paragraph(title != null && !title.isBlank() ? title : "프로젝트 계획서", titleFont));
            if (author != null && !author.isBlank()) {
                Paragraph sub = new Paragraph(author, metaFont);
                sub.setSpacingBefore(4f);
                document.add(sub);
            }
            Paragraph dateP = new Paragraph(date != null && !date.isBlank() ? date : "", metaFont);
            dateP.setSpacingBefore(2f);
            dateP.setSpacingAfter(16f);
            document.add(dateP);

            addTextSection(document, "배경 및 목표 개요", planOverview, headingFont, bodyFont);
            addListSection(document, "핵심 목표", planGoals, headingFont, bodyFont);
            addTaskTableSection(document, "작업 및 일정", planTasks, headingFont, tableHeaderFont, tableBodyFont);
            addRoleTableSection(document, "역할 및 담당", planRoles, headingFont, tableHeaderFont, tableBodyFont);
            addBudgetTableSection(document, "예산 계획", planBudgetItems, headingFont, tableHeaderFont, tableBodyFont);
            addTextSection(document, "기타 참고사항", planNotes, headingFont, bodyFont);

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("계획서 PDF 생성 중 오류가 발생했습니다.", e);
        }
    }

    private void addHeading(Document document, String heading, Font headingFont) throws Exception {
        Paragraph headingP = new Paragraph(heading, headingFont);
        headingP.setSpacingBefore(16f);
        headingP.setSpacingAfter(6f);
        document.add(headingP);
    }

    private void addTextSection(Document document, String heading, String content, Font headingFont, Font bodyFont) throws Exception {
        if (content == null || content.isBlank()) return;
        addHeading(document, heading, headingFont);
        document.add(new Paragraph(content, bodyFont));
    }

    private void addListSection(Document document, String heading, List<String> items, Font headingFont, Font bodyFont) throws Exception {
        if (items == null || items.isEmpty()) return;
        addHeading(document, heading, headingFont);
        for (String item : items) {
            if (item == null || item.isBlank()) continue;
            Paragraph p = new Paragraph("•  " + item, bodyFont);
            p.setSpacingAfter(3f);
            document.add(p);
        }
    }

    private void addTaskTableSection(Document document, String heading, List<PlanTaskDto> rows,
                                      Font headingFont, Font headerFont, Font bodyFont) throws Exception {
        List<PlanTaskDto> valid = rows == null ? List.of() : rows.stream()
                .filter(r -> hasText(r.task()) || hasText(r.assignee()) || hasText(r.deadline())).toList();
        if (valid.isEmpty()) return;
        addHeading(document, heading, headingFont);
        PdfPTable table = newTable(TASK_WIDTHS);
        addHeaderCell(table, "작업명", headerFont);
        addHeaderCell(table, "담당자", headerFont);
        addHeaderCell(table, "기한", headerFont);
        for (PlanTaskDto row : valid) {
            addBodyCell(table, row.task(), bodyFont);
            addBodyCell(table, row.assignee(), bodyFont);
            addBodyCell(table, row.deadline(), bodyFont);
        }
        document.add(table);
    }

    private void addRoleTableSection(Document document, String heading, List<PlanRoleDto> rows,
                                      Font headingFont, Font headerFont, Font bodyFont) throws Exception {
        List<PlanRoleDto> valid = rows == null ? List.of() : rows.stream()
                .filter(r -> hasText(r.name()) || hasText(r.role()) || hasText(r.duties())).toList();
        if (valid.isEmpty()) return;
        addHeading(document, heading, headingFont);
        PdfPTable table = newTable(ROLE_WIDTHS);
        addHeaderCell(table, "이름", headerFont);
        addHeaderCell(table, "역할", headerFont);
        addHeaderCell(table, "담당 업무", headerFont);
        for (PlanRoleDto row : valid) {
            addBodyCell(table, row.name(), bodyFont);
            addBodyCell(table, row.role(), bodyFont);
            addBodyCell(table, row.duties(), bodyFont);
        }
        document.add(table);
    }

    private void addBudgetTableSection(Document document, String heading, List<PlanBudgetItemDto> rows,
                                        Font headingFont, Font headerFont, Font bodyFont) throws Exception {
        List<PlanBudgetItemDto> valid = rows == null ? List.of() : rows.stream()
                .filter(r -> hasText(r.item()) || hasText(r.amount()) || hasText(r.note())).toList();
        if (valid.isEmpty()) return;
        addHeading(document, heading, headingFont);
        PdfPTable table = newTable(BUDGET_WIDTHS);
        addHeaderCell(table, "항목", headerFont);
        addHeaderCell(table, "금액", headerFont);
        addHeaderCell(table, "비고", headerFont);
        for (PlanBudgetItemDto row : valid) {
            addBodyCell(table, row.item(), bodyFont);
            addBodyCell(table, row.amount(), bodyFont);
            addBodyCell(table, row.note(), bodyFont);
        }
        document.add(table);
    }

    private boolean hasText(String s) {
        return s != null && !s.isBlank();
    }

    private PdfPTable newTable(float[] widths) throws Exception {
        PdfPTable table = new PdfPTable(widths);
        table.setWidthPercentage(100);
        table.setSpacingBefore(2f);
        return table;
    }

    private void addHeaderCell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Paragraph(text, font));
        cell.setBackgroundColor(new java.awt.Color(0x33, 0x33, 0x33));
        cell.setPadding(6f);
        cell.setHorizontalAlignment(Element.ALIGN_LEFT);
        cell.getPhrase().getFont().setColor(java.awt.Color.WHITE);
        table.addCell(cell);
    }

    private void addBodyCell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Paragraph(text == null ? "" : text, font));
        cell.setPadding(6f);
        table.addCell(cell);
    }

    private Font loadFont(float size, int style) throws Exception {
        InputStream fontStream = getClass().getResourceAsStream(FONT_RESOURCE);
        if (fontStream == null) {
            throw new IllegalStateException("한글 폰트 리소스를 찾을 수 없습니다: " + FONT_RESOURCE);
        }
        byte[] fontBytes = fontStream.readAllBytes();
        com.lowagie.text.pdf.BaseFont baseFont = com.lowagie.text.pdf.BaseFont.createFont(
                "NotoSansKR.ttf", com.lowagie.text.pdf.BaseFont.IDENTITY_H, com.lowagie.text.pdf.BaseFont.EMBEDDED,
                true, fontBytes, null);
        return new Font(baseFont, size, style);
    }
}
