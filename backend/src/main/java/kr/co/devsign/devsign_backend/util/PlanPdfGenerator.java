package kr.co.devsign.devsign_backend.util;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

// 총회 계획서(PLAN)를 웹에서 작성한 내용을 관리자 ZIP 다운로드용 PDF로 변환.
// 한글이 어떤 뷰어에서도 깨지지 않도록, 시스템 폰트에 의존하지 않고 한글 서브셋 폰트(NotoSansKR)를
// 직접 리소스로 번들해 PDF 안에 임베드한다.
@Component
public class PlanPdfGenerator {

    private static final String FONT_RESOURCE = "/fonts/NotoSansKR.ttf";

    public byte[] generate(String title, String competitionOrProjectTitle, String date,
                            String goal, String schedule, String teamRoles, String budget, String notes) {
        try {
            Font titleFont = loadFont(20, Font.BOLD);
            Font headingFont = loadFont(13, Font.BOLD);
            Font bodyFont = loadFont(11, Font.NORMAL);
            Font metaFont = loadFont(10, Font.NORMAL);

            Document document = new Document(PageSize.A4, 50, 50, 50, 50);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            PdfWriter.getInstance(document, out);
            document.open();

            document.add(new Paragraph(title != null && !title.isBlank() ? title : "프로젝트 계획서", titleFont));
            if (competitionOrProjectTitle != null && !competitionOrProjectTitle.isBlank()) {
                Paragraph sub = new Paragraph(competitionOrProjectTitle, metaFont);
                sub.setSpacingBefore(4f);
                document.add(sub);
            }
            if (date != null && !date.isBlank()) {
                Paragraph dateP = new Paragraph(date, metaFont);
                dateP.setSpacingBefore(2f);
                dateP.setSpacingAfter(16f);
                document.add(dateP);
            } else {
                Paragraph spacer = new Paragraph(" ", metaFont);
                spacer.setSpacingAfter(12f);
                document.add(spacer);
            }

            addSection(document, "목표", goal, headingFont, bodyFont);
            addSection(document, "추진 일정", schedule, headingFont, bodyFont);
            addSection(document, "팀 구성 및 역할 분담", teamRoles, headingFont, bodyFont);
            addSection(document, "예산 계획", budget, headingFont, bodyFont);
            addSection(document, "기타 참고사항", notes, headingFont, bodyFont);

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("계획서 PDF 생성 중 오류가 발생했습니다.", e);
        }
    }

    private void addSection(Document document, String heading, String content, Font headingFont, Font bodyFont) throws Exception {
        if (content == null || content.isBlank()) return;

        Paragraph headingP = new Paragraph(heading, headingFont);
        headingP.setSpacingBefore(14f);
        headingP.setSpacingAfter(6f);
        document.add(headingP);

        Paragraph bodyP = new Paragraph(content, bodyFont);
        bodyP.setAlignment(Element.ALIGN_LEFT);
        document.add(bodyP);
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
