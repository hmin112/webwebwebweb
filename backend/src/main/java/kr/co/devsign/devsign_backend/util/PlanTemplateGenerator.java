package kr.co.devsign.devsign_backend.util;

import org.apache.poi.xwpf.usermodel.ParagraphAlignment;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;

// ✨ [2026-09-29 신규] 계획서 파일 업로드용 빈 양식(.docx). PlanFileExtractor가 "■ 항목 제목"을 기준으로
// 내용을 뽑아내므로, 제목 줄 문구는 추출기 별칭(ALIASES)과 반드시 맞춰야 한다. 괄호로만 된 안내 문구와
// ※로 시작하는 줄은 추출 시 무시된다.
@Component
public class PlanTemplateGenerator {

    private static final String FONT = "맑은 고딕";

    public byte[] generate(boolean team) {
        try (XWPFDocument doc = new XWPFDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            XWPFParagraph title = doc.createParagraph();
            title.setAlignment(ParagraphAlignment.CENTER);
            run(title, team ? "DEVSIGN 팀 프로젝트 계획서" : "DEVSIGN 프로젝트 계획서", 18, true, "1E1B4B");

            guide(doc, "※ ■ 로 시작하는 항목 제목은 지우거나 바꾸지 마세요. 웹에 파일을 올리면 항목별로 자동으로 채워집니다.");
            guide(doc, "※ 괄호로 된 안내 문구는 지워도 되고, 남겨두어도 추출되지 않습니다.");

            if (!team) {
                heading(doc, "■ 프로젝트 명 (필수)");
                hint(doc, "(예: 스마트홈 IoT 프로젝트)");
                doc.createParagraph();
            }

            heading(doc, "■ 배경 및 목표 개요 (필수)");
            hint(doc, "(이 프로젝트를 왜 하는지, 무엇을 이루고 싶은지 자유롭게 적어주세요.)");
            doc.createParagraph();

            heading(doc, "■ 핵심 목표 (필수 · 최소 2개, 최대 10개)");
            hint(doc, "(한 줄에 목표 하나씩 번호를 붙여 적어주세요. 예: 1. 지문인식 도어락 웹 원격 제어 구현)");
            body(doc, "1. ");
            body(doc, "2. ");

            heading(doc, "■ 로드맵 (필수 · 최소 1개)");
            hint(doc, "(날짜는 2026-09-01 형식으로 적어주세요. 행이 모자라면 표에 행을 추가하면 됩니다.)");
            table(doc, List.of("일정 제목", "시작일", "종료일", "상세 내용"), 4, List.of());

            heading(doc, team ? "■ 역할 및 담당 (필수 아님 · 팀원 전원 권장)" : "■ 역할 및 담당 (선택)");
            hint(doc, team
                    ? "(웹에 가입한 팀원은 이름이 같으면 자동으로 프로필이 연결됩니다.)"
                    : "(팀 없이 혼자 하는 프로젝트라면 비워두세요.)");
            table(doc, List.of("이름", "역할", "담당 업무"), team ? 4 : 2, List.of());

            heading(doc, "■ 관련 링크 (선택)");
            table(doc, List.of("이름", "링크"), 2, List.of("Git", "Notion"));

            heading(doc, "■ 기타 참고사항 (선택)");
            hint(doc, "(그 외 자유롭게 남기고 싶은 내용을 적어주세요.)");
            doc.createParagraph();

            doc.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private void heading(XWPFDocument doc, String text) {
        XWPFParagraph p = doc.createParagraph();
        p.setSpacingBefore(360);
        p.setSpacingAfter(80);
        run(p, text, 13, true, "4F46E5");
    }

    private void hint(XWPFDocument doc, String text) {
        run(doc.createParagraph(), text, 9, false, "94A3B8");
    }

    private void guide(XWPFDocument doc, String text) {
        run(doc.createParagraph(), text, 9, false, "64748B");
    }

    private void body(XWPFDocument doc, String text) {
        run(doc.createParagraph(), text, 11, false, "0F172A");
    }

    private void run(XWPFParagraph p, String text, int size, boolean bold, String color) {
        XWPFRun r = p.createRun();
        r.setText(text);
        r.setFontSize(size);
        r.setBold(bold);
        r.setColor(color);
        r.setFontFamily(FONT);
    }

    private void table(XWPFDocument doc, List<String> headers, int emptyRows, List<String> firstColumnValues) {
        int rows = Math.max(emptyRows, firstColumnValues.size());
        XWPFTable table = doc.createTable(rows + 1, headers.size());
        table.setWidth("100%");
        XWPFTableRow headerRow = table.getRow(0);
        for (int c = 0; c < headers.size(); c++) {
            XWPFTableCell cell = headerRow.getCell(c);
            cell.setColor("EEF2FF");
            XWPFParagraph p = cell.getParagraphs().get(0);
            run(p, headers.get(c), 10, true, "312E81");
        }
        for (int r = 0; r < firstColumnValues.size(); r++) {
            XWPFParagraph p = table.getRow(r + 1).getCell(0).getParagraphs().get(0);
            run(p, firstColumnValues.get(r), 10, false, "0F172A");
        }
    }
}
