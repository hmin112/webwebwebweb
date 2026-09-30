package kr.co.devsign.devsign_backend.util;

import kr.co.devsign.devsign_backend.dto.assembly.ExtractedPlanDto;
import kr.co.devsign.devsign_backend.dto.assembly.PlanLinkDto;
import kr.co.devsign.devsign_backend.dto.assembly.PlanRoadmapItemDto;
import kr.co.devsign.devsign_backend.dto.assembly.PlanRoleDto;
import kr.dogfoot.hwplib.object.HWPFile;
import kr.dogfoot.hwplib.object.bodytext.Section;
import kr.dogfoot.hwplib.object.bodytext.control.Control;
import kr.dogfoot.hwplib.object.bodytext.control.ControlTable;
import kr.dogfoot.hwplib.object.bodytext.control.gso.ControlRectangle;
import kr.dogfoot.hwplib.object.bodytext.control.table.Cell;
import kr.dogfoot.hwplib.object.bodytext.control.table.Row;
import kr.dogfoot.hwplib.object.bodytext.paragraph.Paragraph;
import kr.dogfoot.hwplib.reader.HWPReader;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFGroupShape;
import org.apache.poi.xslf.usermodel.XSLFShape;
import org.apache.poi.xslf.usermodel.XSLFSlide;
import org.apache.poi.xslf.usermodel.XSLFTable;
import org.apache.poi.xslf.usermodel.XSLFTableCell;
import org.apache.poi.xslf.usermodel.XSLFTableRow;
import org.apache.poi.xslf.usermodel.XSLFTextParagraph;
import org.apache.poi.xslf.usermodel.XSLFTextShape;
import org.apache.poi.xwpf.usermodel.IBodyElement;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Element;
import org.jsoup.parser.Parser;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.awt.geom.Rectangle2D;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

// ✨ [2026-09-29 신규] 총회 계획서 파일(PDF/DOCX/HWP/HWPX/PPTX)에서 정해진 양식의 항목을 뽑아내는 추출기.
// AI 요약이 아니라 "■ 핵심 목표" 같은 양식 제목을 기준으로 구간을 나눠 그대로 옮겨 담는 방식이라,
// 양식 제목을 찾지 못하면 아무것도 채우지 않고 파일만 첨부된다.
@Component
public class PlanFileExtractor {

    public static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "docx", "hwp", "hwpx", "pptx");

    private static final int MAX_GOALS = 10;
    private static final long MAX_HWPX_SECTION_BYTES = 20L * 1024 * 1024;

    private enum PlanSection { TITLE, OVERVIEW, GOALS, ROADMAP, ROLES, LINKS, NOTES }

    // 양식 제목 별칭 — 공백 제거 후 비교한다
    private static final Map<PlanSection, List<String>> ALIASES = new EnumMap<>(PlanSection.class);

    static {
        ALIASES.put(PlanSection.TITLE, List.of("프로젝트명", "프로젝트이름", "프로젝트제목", "과제명", "팀프로젝트명", "팀프로젝트이름", "팀프로젝트제목"));
        ALIASES.put(PlanSection.OVERVIEW, List.of("배경및목표개요", "개요", "프로젝트개요", "배경", "추진배경", "배경및목적", "프로젝트소개"));
        ALIASES.put(PlanSection.GOALS, List.of("핵심목표", "목표", "세부목표", "프로젝트목표", "주요목표"));
        ALIASES.put(PlanSection.ROADMAP, List.of("로드맵", "일정", "추진일정", "개발일정", "세부일정", "진행일정"));
        ALIASES.put(PlanSection.ROLES, List.of("역할및담당", "역할", "역할분담", "팀구성", "팀원구성", "팀원및역할", "역할및책임", "담당업무"));
        ALIASES.put(PlanSection.LINKS, List.of("관련링크", "링크", "참고링크"));
        ALIASES.put(PlanSection.NOTES, List.of("기타참고사항", "기타", "비고", "참고사항"));
    }

    private static final Pattern LEADING_DECORATION = Pattern.compile(
            "^(?:[\\s■□▪▫●○◆◇▶▷►•·∙※\\-*#>\\[\\]【】〈〉<「」『』]+|\\(\\d{1,2}\\)\\s*|\\d{1,2}(?:\\.\\d{1,2})+\\.?\\s*|(?:\\d{1,2}|[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+|[가나다라마바사아자차카타파하])\\s*[.)]\\s*)+");
    // 양식에 없는 다른 장 제목("2. 작업 분해 (Task Decomposition)", "1.3 기대 효과", "■ 예산") — 여기서 구간을 끊는다
    private static final Pattern FOREIGN_HEADING = Pattern.compile(
            "^\\s*(?:■.{1,40}|\\d{1,2}(?:\\.\\d{1,2})+\\.?\\s+\\S.{0,40}|[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+\\s*[.)]?\\s+\\S.{0,40}"
                    + "|(?:\\d{1,2}[.)])\\s*[^\\t]{1,40}\\(\\s*[A-Za-z][A-Za-z &/,.\\-]*\\)\\s*)$");
    private static final Pattern LIST_MARKER = Pattern.compile(
            "^\\s*(?:[■□▪▫●○◆◇▶▷►•·∙\\-*]|\\(?\\d{1,2}[.)]|\\(\\d{1,2}\\)|[가나다라마바사아자차카타파하][.)])\\s*");
    private static final Pattern PARENTHETICAL = Pattern.compile("\\([^)]*\\)|（[^）]*）");

    private static final Pattern DATE_FULL = Pattern.compile(
            "(?<!\\d)(\\d{4})\\s*[.\\-/년]\\s*(\\d{1,2})\\s*[.\\-/월]\\s*(\\d{1,2})(?!\\d)\\s*일?\\.?");
    private static final Pattern DATE_YY = Pattern.compile(
            "(?<![\\d.])(\\d{2})[.\\-/](\\d{1,2})[.\\-/](\\d{1,2})(?![\\d])\\.?");
    private static final Pattern DATE_SHORT = Pattern.compile(
            "(?<![\\d.])(\\d{1,2})\\s*[./월]\\s*(\\d{1,2})(?![\\d])\\s*일?\\.?");

    // ✨ [2026-09-30] 역할 줄 맨 앞의 "학번 이름(직책)" — 예: "22 김형민(회장)", "LAB 김철수", "24 박도윤 (부회장)", "김형민"
    private static final Pattern ROLE_NAME_PREFIX = Pattern.compile(
            "^((?:\\d{2}|LAB)\\s*)?[가-힣]{2,5}(?:\\s*[(（][^)）]{1,10}[)）])?(?=\\s|$|[-–—:：,])");
    private static final Pattern URL = Pattern.compile("(https?://[^\\s<>\"'|]+|www\\.[^\\s<>\"'|]+)");

    public record Result(ExtractedPlanDto plan, boolean templateRecognized, List<String> warnings) {}

    public static String extensionOf(String fileName) {
        if (!StringUtils.hasText(fileName)) return "";
        int dot = fileName.lastIndexOf('.');
        if (dot < 0 || dot == fileName.length() - 1) return "";
        return fileName.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

    public Result extract(Path file, String extension, int defaultYear) {
        List<String> warnings = new ArrayList<>();
        List<String> lines;
        try {
            lines = switch (extension) {
                case "pdf" -> extractPdf(file);
                case "docx" -> extractDocx(file);
                case "pptx" -> extractPptx(file);
                case "hwpx" -> extractHwpx(file);
                case "hwp" -> extractHwp(file);
                default -> throw new IllegalArgumentException("unsupported");
            };
        } catch (Exception | LinkageError e) {
            warnings.add("파일에서 글자를 읽지 못했어요. 암호가 걸렸거나 배포용·손상된 파일일 수 있어요. 파일은 그대로 첨부됐으니 내용은 직접 입력해주세요.");
            return new Result(emptyPlan(), false, warnings);
        }
        return parse(lines, defaultYear, warnings);
    }

    // =====================================================================
    // 1) 형식별 텍스트 추출 — 표는 "셀1\t셀2\t셀3" 한 줄로 펼친다
    // =====================================================================

    private List<String> extractPdf(Path file) throws IOException {
        try (PDDocument doc = Loader.loadPDF(file.toFile())) {
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            List<String> out = new ArrayList<>();
            addTextLines(out, stripper.getText(doc));
            return out;
        }
    }

    private List<String> extractDocx(Path file) throws IOException {
        List<String> out = new ArrayList<>();
        try (InputStream in = Files.newInputStream(file); XWPFDocument doc = new XWPFDocument(in)) {
            for (IBodyElement el : doc.getBodyElements()) {
                if (el instanceof XWPFParagraph p) {
                    addTextLines(out, p.getText());
                } else if (el instanceof XWPFTable t) {
                    emitTable(docxTable(t), out);
                }
            }
        }
        return out;
    }

    private List<List<List<String>>> docxTable(XWPFTable table) {
        List<List<List<String>>> rows = new ArrayList<>();
        for (XWPFTableRow row : table.getRows()) {
            List<List<String>> cells = new ArrayList<>();
            for (XWPFTableCell cell : row.getTableCells()) {
                List<String> cellLines = new ArrayList<>();
                for (IBodyElement el : cell.getBodyElements()) {
                    if (el instanceof XWPFParagraph p) {
                        addTextLines(cellLines, p.getText());
                    } else if (el instanceof XWPFTable nested) {
                        emitTable(docxTable(nested), cellLines);
                    }
                }
                cells.add(cellLines);
            }
            rows.add(cells);
        }
        return rows;
    }

    private List<String> extractPptx(Path file) throws IOException {
        List<String> out = new ArrayList<>();
        try (InputStream in = Files.newInputStream(file); XMLSlideShow ppt = new XMLSlideShow(in)) {
            for (XSLFSlide slide : ppt.getSlides()) {
                emitShapes(slide.getShapes(), out);
            }
        }
        return out;
    }

    private void emitShapes(List<XSLFShape> shapes, List<String> out) {
        // 슬라이드 도형 순서는 읽는 순서와 다를 수 있어 위→아래, 왼→오 순으로 정렬
        List<XSLFShape> sorted = new ArrayList<>(shapes);
        sorted.sort(Comparator
                .comparingDouble((XSLFShape s) -> anchorOf(s).getY())
                .thenComparingDouble(s -> anchorOf(s).getX()));
        for (XSLFShape shape : sorted) {
            if (shape instanceof XSLFGroupShape group) {
                emitShapes(group.getShapes(), out);
            } else if (shape instanceof XSLFTable table) {
                List<List<List<String>>> rows = new ArrayList<>();
                for (XSLFTableRow row : table.getRows()) {
                    List<List<String>> cells = new ArrayList<>();
                    for (XSLFTableCell cell : row.getCells()) {
                        List<String> cellLines = new ArrayList<>();
                        for (XSLFTextParagraph p : cell.getTextParagraphs()) {
                            addTextLines(cellLines, p.getText());
                        }
                        cells.add(cellLines);
                    }
                    rows.add(cells);
                }
                emitTable(rows, out);
            } else if (shape instanceof XSLFTextShape textShape) {
                for (XSLFTextParagraph p : textShape.getTextParagraphs()) {
                    addTextLines(out, p.getText());
                }
            }
        }
    }

    private Rectangle2D anchorOf(XSLFShape shape) {
        try {
            Rectangle2D anchor = shape.getAnchor();
            return anchor != null ? anchor : new Rectangle2D.Double();
        } catch (RuntimeException e) {
            return new Rectangle2D.Double();
        }
    }

    private List<String> extractHwpx(Path file) throws IOException {
        // Contents/section0.xml, section1.xml ... 순서대로 본문을 읽는다
        Map<Integer, String> sections = new TreeMap<>();
        Pattern sectionName = Pattern.compile("^Contents/section(\\d+)\\.xml$");
        try (ZipInputStream zip = new ZipInputStream(Files.newInputStream(file))) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                Matcher m = sectionName.matcher(entry.getName());
                if (!m.matches()) continue;
                sections.put(Integer.parseInt(m.group(1)), readLimited(zip));
            }
        }
        if (sections.isEmpty()) {
            throw new IOException("no hwpx sections");
        }
        List<String> out = new ArrayList<>();
        for (String xml : sections.values()) {
            Element root = Jsoup.parse(xml, "", Parser.xmlParser());
            walkHwpx(root, out);
        }
        return out;
    }

    private String readLimited(InputStream in) throws IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        byte[] chunk = new byte[8192];
        long total = 0;
        int read;
        while ((read = in.read(chunk)) != -1) {
            total += read;
            if (total > MAX_HWPX_SECTION_BYTES) {
                throw new IOException("hwpx section too large");
            }
            buffer.write(chunk, 0, read);
        }
        return buffer.toString(StandardCharsets.UTF_8);
    }

    private static String localName(Element el) {
        String name = el.tagName();
        int colon = name.indexOf(':');
        return colon >= 0 ? name.substring(colon + 1) : name;
    }

    private void walkHwpx(Element node, List<String> out) {
        for (Element child : node.children()) {
            String name = localName(child);
            if ("tbl".equals(name)) {
                emitTable(hwpxTable(child), out);
            } else if ("p".equals(name)) {
                StringBuilder text = new StringBuilder();
                List<Element> tables = new ArrayList<>();
                collectHwpxParagraph(child, text, tables);
                addTextLines(out, text.toString());
                for (Element table : tables) {
                    emitTable(hwpxTable(table), out);
                }
            } else {
                walkHwpx(child, out);
            }
        }
    }

    private void collectHwpxParagraph(Element node, StringBuilder text, List<Element> tables) {
        for (Element child : node.children()) {
            String name = localName(child);
            if ("t".equals(name)) {
                text.append(child.text());
            } else if ("tbl".equals(name)) {
                tables.add(child);
            } else if ("lineBreak".equals(name)) {
                text.append('\n');
            } else if ("tab".equals(name)) {
                text.append(' ');
            } else if ("subList".equals(name)) {
                // 글상자(drawText > subList) 안의 문단도 본문 흐름에 포함
                List<String> inner = new ArrayList<>();
                walkHwpx(child, inner);
                for (String line : inner) text.append('\n').append(line);
            } else {
                collectHwpxParagraph(child, text, tables);
            }
        }
    }

    private List<List<List<String>>> hwpxTable(Element table) {
        List<List<List<String>>> rows = new ArrayList<>();
        for (Element tr : table.children()) {
            if (!"tr".equals(localName(tr))) continue;
            List<List<String>> cells = new ArrayList<>();
            for (Element tc : tr.children()) {
                if (!"tc".equals(localName(tc))) continue;
                List<String> cellLines = new ArrayList<>();
                walkHwpx(tc, cellLines);
                cells.add(cellLines);
            }
            rows.add(cells);
        }
        return rows;
    }

    private List<String> extractHwp(Path file) throws Exception {
        HWPFile hwp;
        try (InputStream in = Files.newInputStream(file)) {
            hwp = HWPReader.fromInputStream(in);
        }
        List<String> out = new ArrayList<>();
        for (Section section : hwp.getBodyText().getSectionList()) {
            walkHwpParagraphs(section.getParagraphs(), out);
        }
        return out;
    }

    private void walkHwpParagraphs(Paragraph[] paragraphs, List<String> out) throws IOException {
        if (paragraphs == null) return;
        for (Paragraph p : paragraphs) {
            if (p == null) continue;
            String text = p.getText() != null ? p.getNormalString() : "";
            addTextLines(out, text);
            if (p.getControlList() == null) continue;
            for (Control control : p.getControlList()) {
                if (control instanceof ControlTable table) {
                    List<List<List<String>>> rows = new ArrayList<>();
                    for (Row row : table.getRowList()) {
                        List<List<String>> cells = new ArrayList<>();
                        for (Cell cell : row.getCellList()) {
                            List<String> cellLines = new ArrayList<>();
                            if (cell.getParagraphList() != null) {
                                walkHwpParagraphs(cell.getParagraphList().getParagraphs(), cellLines);
                            }
                            cells.add(cellLines);
                        }
                        rows.add(cells);
                    }
                    emitTable(rows, out);
                } else if (control instanceof ControlRectangle rect && rect.getTextBox() != null
                        && rect.getTextBox().getParagraphList() != null) {
                    walkHwpParagraphs(rect.getTextBox().getParagraphList().getParagraphs(), out);
                }
            }
        }
    }

    private void addTextLines(List<String> out, String text) {
        if (text == null) return;
        String normalized = text
                .replace(' ', ' ')
                .replace('\u000b', '\n')
                .replace(' ', '\n')
                .replace("\r", "");
        for (String line : normalized.split("\n")) {
            out.add(line);
        }
    }

    // 표 한 행 → 첫 칸이 양식 제목이면(예: "개요 | 내용...") 제목 줄 + 내용 줄로, 칸이 하나면 칸 안의 줄들을
    // 그대로, 그 외엔 "칸\t칸\t칸" 한 줄로 펼친다
    private void emitTable(List<List<List<String>>> rows, List<String> out) {
        for (List<List<String>> cells : rows) {
            if (cells.isEmpty()) continue;
            String first = flatten(cells.get(0));
            if (cells.size() >= 2 && matchHeading(first) != null) {
                out.add(first);
                if (cells.size() == 2) {
                    out.addAll(cells.get(1));
                } else {
                    out.add(joinCells(cells.subList(1, cells.size())));
                }
            } else if (cells.size() == 1) {
                out.addAll(cells.get(0));
            } else {
                out.add(joinCells(cells));
            }
        }
    }

    private String flatten(List<String> cellLines) {
        return String.join(" ", cellLines).replaceAll("\\s+", " ").trim();
    }

    private String joinCells(List<List<String>> cells) {
        List<String> flat = new ArrayList<>();
        for (List<String> cell : cells) flat.add(flatten(cell));
        return String.join("\t", flat);
    }

    // =====================================================================
    // 2) 양식 제목 기준으로 구간 나누기
    // =====================================================================

    private record HeadingMatch(PlanSection section, String inline) {}

    private HeadingMatch matchHeading(String raw) {
        if (raw == null) return null;
        String line = raw.strip();
        if (line.isEmpty() || line.length() > 60 && !line.contains(":") && !line.contains("\t")) return null;

        String head = line;
        String inline = "";
        int tab = line.indexOf('\t');
        // "(필수: 최소 1개)"처럼 괄호 안의 콜론은 제목/내용 구분자로 보지 않는다
        String scan = PARENTHETICAL.matcher(line).replaceAll(m -> "_".repeat(m.group().length()));
        int colon = indexOfColon(scan);
        if (tab >= 0 && (colon < 0 || tab < colon)) {
            head = line.substring(0, tab);
            inline = line.substring(tab + 1).replace('\t', ' ').trim();
        } else if (colon >= 0) {
            head = line.substring(0, colon);
            inline = line.substring(colon + 1).trim();
        }

        String key = normalizeKey(head);
        if (key.isEmpty() || key.length() > 20) return null;
        // "프로젝트 로드맵 / 일정"처럼 앞에 "프로젝트"가 붙거나 "/"로 여러 이름을 적은 경우도 인정
        List<String> candidates = new ArrayList<>();
        candidates.add(key);
        for (String part : key.split("/")) {
            if (part.isEmpty()) continue;
            candidates.add(part);
            if (part.startsWith("프로젝트") && part.length() > 4) candidates.add(part.substring(4));
        }
        for (String candidate : candidates) {
            for (Map.Entry<PlanSection, List<String>> entry : ALIASES.entrySet()) {
                if (entry.getValue().contains(candidate)) {
                    return new HeadingMatch(entry.getKey(), inline);
                }
            }
        }
        return null;
    }

    private int indexOfColon(String s) {
        int a = s.indexOf(':');
        int b = s.indexOf('：');
        if (a < 0) return b;
        if (b < 0) return a;
        return Math.min(a, b);
    }

    private String normalizeKey(String head) {
        String s = LEADING_DECORATION.matcher(head.strip()).replaceFirst("");
        s = PARENTHETICAL.matcher(s).replaceAll("");
        return s.replaceAll("[\\s*\\[\\]【】〈〉<>「」『』■□●○◆◇▶▷►•·:：]", "").replaceAll("/+", "/").replaceAll("^/|/$", "");
    }

    private boolean isGuideLine(String line) {
        String t = line.strip();
        return t.startsWith("※")
                || (t.startsWith("(") && t.endsWith(")"))
                || (t.startsWith("（") && t.endsWith("）"));
    }

    private Result parse(List<String> lines, int defaultYear, List<String> warnings) {
        Map<PlanSection, List<String>> buckets = new LinkedHashMap<>();
        for (PlanSection s : PlanSection.values()) buckets.put(s, new ArrayList<>());

        PlanSection current = null;
        boolean anyHeading = false;
        for (String line : lines) {
            if (line == null || line.strip().isEmpty()) continue;
            HeadingMatch heading = matchHeading(line);
            if (heading != null) {
                current = heading.section();
                anyHeading = true;
                if (!heading.inline().isBlank() && !isGuideLine(heading.inline())) {
                    buckets.get(current).add(heading.inline());
                }
                continue;
            }
            if (!line.contains("\t") && FOREIGN_HEADING.matcher(line.strip()).matches()
                    && findDates(line, defaultYear).isEmpty()) {
                current = null;
                continue;
            }
            if (current == null || isGuideLine(line)) continue;
            buckets.get(current).add(line);
        }

        if (!anyHeading) {
            warnings.add("계획서 양식의 항목 제목(■ 핵심 목표, ■ 로드맵 등)을 찾지 못해 자동으로 채우지 못했어요. 파일은 첨부됐으니 내용은 직접 입력해주세요.");
            return new Result(emptyPlan(), false, warnings);
        }

        String title = parseTitle(buckets.get(PlanSection.TITLE));
        String overview = parseParagraphs(buckets.get(PlanSection.OVERVIEW));
        List<String> goals = parseGoals(buckets.get(PlanSection.GOALS), warnings);
        List<PlanRoadmapItemDto> roadmap = parseRoadmap(buckets.get(PlanSection.ROADMAP), defaultYear, warnings);
        List<PlanRoleDto> roles = parseRoles(buckets.get(PlanSection.ROLES));
        List<PlanLinkDto> links = parseLinks(buckets.get(PlanSection.LINKS));
        String notes = parseParagraphs(buckets.get(PlanSection.NOTES));

        if (!StringUtils.hasText(overview)) warnings.add("‘배경 및 목표 개요’를 찾지 못했어요.");
        if (goals.size() < 2) warnings.add("‘핵심 목표’가 2개 미만으로 읽혔어요. (최소 2개 필요)");
        if (roadmap.isEmpty()) warnings.add("‘로드맵’ 일정을 찾지 못했어요. (최소 1개 필요)");

        return new Result(new ExtractedPlanDto(title, overview, goals, roadmap, roles, links, notes), true, warnings);
    }

    private ExtractedPlanDto emptyPlan() {
        return new ExtractedPlanDto("", "", List.of(), List.of(), List.of(), List.of(), "");
    }

    // =====================================================================
    // 3) 항목별 해석
    // =====================================================================

    private String stripListMarker(String s) {
        return LIST_MARKER.matcher(s).replaceFirst("").strip();
    }

    private String parseTitle(List<String> lines) {
        for (String line : lines) {
            String t = stripListMarker(line.replace('\t', ' ')).replaceAll("\\s+", " ").trim();
            if (!t.isEmpty()) return t.length() > 100 ? t.substring(0, 100) : t;
        }
        return "";
    }

    private String parseParagraphs(List<String> lines) {
        List<String> out = new ArrayList<>();
        for (String line : lines) {
            String t = line.replace('\t', ' ').replaceAll("[ ]{2,}", " ").strip();
            if (!t.isEmpty()) out.add(t);
        }
        return String.join("\n", out);
    }

    private List<String> parseGoals(List<String> lines, List<String> warnings) {
        List<String> cleaned = new ArrayList<>();
        boolean anyMarker = false;
        for (String line : lines) {
            String t = line.replace('\t', ' ').replaceAll("\\s+", " ").strip();
            if (t.isEmpty() || isTableHeader(line, "목표")) continue;
            if (line.split("\t").length >= 3) continue; // 3칸 이상 표 행은 목표 목록이 아님
            if (LIST_MARKER.matcher(t).find()) anyMarker = true;
            cleaned.add(t);
        }

        List<String> goals = new ArrayList<>();
        for (String t : cleaned) {
            boolean marked = LIST_MARKER.matcher(t).find();
            String body = stripListMarker(t);
            if (body.isEmpty()) continue;
            // 번호/글머리표가 있는 문서에서 표시 없는 줄은 앞 목표가 줄바꿈된 것으로 본다(PDF 줄바꿈 대응)
            if (anyMarker && !marked && !goals.isEmpty()) {
                goals.set(goals.size() - 1, goals.get(goals.size() - 1) + " " + body);
            } else {
                goals.add(body);
            }
        }
        if (goals.size() > MAX_GOALS) {
            warnings.add("핵심 목표는 최대 " + MAX_GOALS + "개까지만 가져왔어요.");
            return new ArrayList<>(goals.subList(0, MAX_GOALS));
        }
        return goals;
    }

    private static final List<String> HEADER_WORDS = List.of(
            "일정제목", "상세내용", "담당업무", "시작일", "종료일", "기간", "제목", "이름", "성명", "역할", "담당",
            "링크", "URL", "주소", "내용", "상세", "번호", "No", "날짜", "업무", "구분");

    // 표 머리글 줄("일정 제목 | 시작일 | 종료일 | 상세 내용")인지 — 머리글 단어를 빼고 나면 거의 남는 게 없어야 한다
    private boolean isTableHeader(String line, String... exactWords) {
        String compact = line.replaceAll("[\\s|/·,]", "");
        for (String k : exactWords) {
            if (compact.equals(k)) return true;
        }
        if (compact.length() > 30) return false;
        int hits = 0;
        String rest = compact;
        for (String k : HEADER_WORDS) {
            if (rest.contains(k)) {
                hits++;
                rest = rest.replace(k, "");
            }
        }
        return hits >= 2 && rest.length() <= 3;
    }

    private record DateHit(int start, int end, LocalDate date) {}

    private List<DateHit> findDates(String text, int defaultYear) {
        List<DateHit> hits = new ArrayList<>();
        collectDates(hits, DATE_FULL.matcher(text), m -> safeDate(Integer.parseInt(m.group(1)), m.group(2), m.group(3)));
        collectDates(hits, DATE_YY.matcher(text), m -> safeDate(2000 + Integer.parseInt(m.group(1)), m.group(2), m.group(3)));
        hits.sort(Comparator.comparingInt(DateHit::start));

        // 연도 없는 "9/14", "9월 14일"은 연도 있는 날짜 뒤(종료일)이거나, 연도 있는 날짜가 아예 없을 때만 인정
        int firstFullStart = hits.isEmpty() ? -1 : hits.get(0).start();
        List<DateHit> shortHits = new ArrayList<>();
        Matcher m = DATE_SHORT.matcher(text);
        while (m.find()) {
            int s = m.start();
            int e = m.end();
            if (overlaps(hits, s, e)) continue;
            if (firstFullStart >= 0 && s < firstFullStart) continue;
            int year = defaultYear;
            for (DateHit h : hits) {
                if (h.start() < s) year = h.date().getYear();
            }
            LocalDate d = safeDate(year, m.group(1), m.group(2));
            if (d != null) shortHits.add(new DateHit(s, e, d));
        }
        hits.addAll(shortHits);
        hits.sort(Comparator.comparingInt(DateHit::start));
        return hits;
    }

    private interface DateParser { LocalDate parse(Matcher m); }

    private void collectDates(List<DateHit> hits, Matcher m, DateParser parser) {
        while (m.find()) {
            if (overlaps(hits, m.start(), m.end())) continue;
            LocalDate d = parser.parse(m);
            if (d != null) hits.add(new DateHit(m.start(), m.end(), d));
        }
    }

    private boolean overlaps(List<DateHit> hits, int s, int e) {
        for (DateHit h : hits) {
            if (s < h.end() && e > h.start()) return true;
        }
        return false;
    }

    private LocalDate safeDate(int year, String month, String day) {
        try {
            return LocalDate.of(year, Integer.parseInt(month), Integer.parseInt(day));
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static final Pattern EDGE_SEPARATORS_END = Pattern.compile("[\\s|:：~\\-–—(\\[,]+$");
    private static final Pattern EDGE_SEPARATORS_START = Pattern.compile("^[\\s|:：~\\-–—)\\],]+");

    private String cleanEdges(String s) {
        String t = s.replace('\t', ' ');
        t = EDGE_SEPARATORS_END.matcher(t).replaceAll("");
        t = EDGE_SEPARATORS_START.matcher(t).replaceAll("");
        return t.replaceAll("\\s+", " ").strip();
    }

    private List<PlanRoadmapItemDto> parseRoadmap(List<String> lines, int defaultYear, List<String> warnings) {
        List<String[]> items = new ArrayList<>(); // [title, start, end, detail, datesFromOwnLine]
        for (String raw : lines) {
            String line = raw.strip();
            if (line.isEmpty()) continue;
            List<DateHit> dates = findDates(line, defaultYear);
            if (dates.isEmpty() && isTableHeader(line)) continue;

            if (dates.isEmpty()) {
                String text = cleanEdges(stripListMarker(line));
                if (text.isEmpty()) continue;
                String[] last = items.isEmpty() ? null : items.get(items.size() - 1);
                if (line.contains("\t")) {
                    String[] cells = line.split("\t");
                    String title = cleanEdges(stripListMarker(cells[0]));
                    String detail = cells.length > 1 ? cleanEdges(String.join(" ", java.util.Arrays.copyOfRange(cells, 1, cells.length))) : "";
                    items.add(new String[]{title, "", "", detail, ""});
                } else if (last != null && !last[1].isEmpty() && last[3].isEmpty() && "own".equals(last[4])) {
                    // 표가 칸별로 줄바꿈되어 읽힌 경우(제목 / 시작 / 종료 / 상세) — 날짜 다음 줄은 상세 내용
                    last[3] = text;
                } else if (last != null && !last[1].isEmpty() && !LIST_MARKER.matcher(line).find()
                        && !"own".equals(last[4]) && !last[3].isEmpty()) {
                    last[3] = last[3] + " " + text;
                } else {
                    items.add(new String[]{text, "", "", "", ""});
                }
                continue;
            }

            DateHit first = dates.get(0);
            DateHit second = dates.size() > 1 ? dates.get(1) : null;
            String before = cleanEdges(stripListMarker(line.substring(0, first.start())));
            String after = cleanEdges(line.substring((second != null ? second : first).end()));
            LocalDate start = first.date();
            LocalDate end = second != null ? second.date() : first.date();
            if (start.isAfter(end)) {
                LocalDate tmp = start;
                start = end;
                end = tmp;
            }

            String[] last = items.isEmpty() ? null : items.get(items.size() - 1);
            if (before.isEmpty() && last != null && last[1].isEmpty()) {
                // 날짜만 있는 줄 → 바로 앞 제목에 붙인다
                last[1] = start.toString();
                last[2] = end.toString();
                last[4] = "own";
                if (!after.isEmpty()) last[3] = after;
            } else if (before.isEmpty() && last != null && "own".equals(last[4]) && second == null
                    && last[1].equals(last[2]) && !start.isBefore(LocalDate.parse(last[1]))) {
                // 시작일/종료일이 각각 다른 줄에 있는 경우
                last[2] = start.toString();
                if (!after.isEmpty()) last[3] = after;
            } else {
                String title = before.isEmpty() ? after : before;
                String detail = before.isEmpty() ? "" : after;
                items.add(new String[]{title, start.toString(), end.toString(), detail, ""});
            }
        }

        boolean anyDated = items.stream().anyMatch(it -> !it[1].isEmpty());
        if (!anyDated) {
            if (!items.isEmpty()) {
                warnings.add("로드맵에서 날짜(예: 2026-09-01)를 찾지 못해 일정을 가져오지 않았어요.");
            }
            return new ArrayList<>();
        }
        List<PlanRoadmapItemDto> result = new ArrayList<>();
        for (String[] it : items) {
            if (it[0].isEmpty() && it[1].isEmpty()) continue;
            String title = it[0].isEmpty() ? "일정" : it[0];
            if (title.length() > 100) title = title.substring(0, 100);
            if (it[1].isEmpty()) {
                warnings.add("로드맵 ‘" + title + "’의 날짜를 읽지 못했어요 — 시작일/종료일을 직접 입력해주세요.");
            }
            result.add(new PlanRoadmapItemDto(title, it[1], it[2], it[3]));
        }
        return result;
    }

    private List<PlanRoleDto> parseRoles(List<String> lines) {
        List<PlanRoleDto> roles = new ArrayList<>();
        for (String raw : lines) {
            String line = stripListMarker(raw.strip());
            if (line.isEmpty() || isTableHeader(line)) continue;

            List<String> cells;
            if (line.contains("\t")) {
                cells = splitCells(line, "\t");
            } else if (line.contains("|")) {
                cells = splitCells(line, "\\|");
            } else if (line.contains(" / ")) {
                cells = splitCells(line, "\\s/\\s");
            } else if (indexOfColon(line) > 0) {
                int colon = indexOfColon(line);
                cells = new ArrayList<>();
                cells.add(line.substring(0, colon).trim());
                cells.addAll(splitCells(line.substring(colon + 1), "\\s[-–—]\\s|,"));
            } else {
                // 구분자 없이 띄어쓰기만 있는 줄 — 맨 앞 "학번 이름(직책)"을 한 덩어리 이름으로 떼어낸다.
                // (예전엔 띄어쓰기로만 잘라서 "22 김형민(회장) 팀장 …"의 이름이 "22"로, 역할이 "김형민(회장)"으로 읽혔다)
                java.util.regex.Matcher nm = ROLE_NAME_PREFIX.matcher(line);
                if (nm.find()) {
                    String rest = line.substring(nm.end()).replaceFirst("^[\\s\\-–—:：,]+", "");
                    cells = new ArrayList<>();
                    cells.add(nm.group().replaceAll("\\s+", " ").trim());
                    List<String> restCells = rest.matches(".*\\s[-–—]\\s.*")
                            ? splitCells(rest, "\\s[-–—]\\s")
                            : splitCells(rest, "\\s+");
                    if (!restCells.isEmpty()) cells.add(restCells.get(0));
                    if (restCells.size() > 1) cells.add(String.join(" ", restCells.subList(1, restCells.size())));
                } else {
                    cells = splitCells(line, "\\s+");
                    if (cells.size() > 3) {
                        cells = new ArrayList<>(List.of(cells.get(0), cells.get(1), String.join(" ", cells.subList(2, cells.size()))));
                    }
                }
            }
            if (cells.isEmpty() || Set.of("이름", "성명", "팀원", "구분", "번호").contains(cells.get(0))) continue;
            String name = cells.get(0);
            String role = cells.size() > 1 ? cells.get(1) : "";
            String duties = cells.size() > 2 ? String.join(" ", cells.subList(2, cells.size())) : "";
            roles.add(new PlanRoleDto(null, name, role, duties));
        }
        return roles;
    }

    private List<String> splitCells(String line, String regex) {
        List<String> cells = new ArrayList<>();
        for (String c : line.split(regex)) {
            String t = c.replaceAll("\\s+", " ").trim();
            if (!t.isEmpty()) cells.add(t);
        }
        return cells;
    }

    private List<PlanLinkDto> parseLinks(List<String> lines) {
        List<PlanLinkDto> links = new ArrayList<>();
        for (String raw : lines) {
            String line = stripListMarker(raw.strip());
            Matcher m = URL.matcher(line);
            if (!m.find()) continue;
            String url = m.group(1).replaceAll("[).,;]+$", "");
            if (url.startsWith("www.")) url = "https://" + url;
            String label = cleanEdges(line.substring(0, m.start()));
            if (label.isEmpty()) label = labelFromUrl(url);
            links.add(new PlanLinkDto(label, url));
        }
        return links;
    }

    private String labelFromUrl(String url) {
        String lower = url.toLowerCase(Locale.ROOT);
        if (lower.contains("github.com") || lower.contains("gitlab")) return "Git";
        if (lower.contains("notion")) return "Notion";
        if (lower.contains("figma")) return "Figma";
        String host = lower.replaceFirst("^https?://", "").replaceFirst("^www\\.", "");
        int slash = host.indexOf('/');
        return slash > 0 ? host.substring(0, slash) : host;
    }
}
