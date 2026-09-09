package kr.co.devsign.devsign_backend.service;

import kr.co.devsign.devsign_backend.dto.fee.FeeMonthResponse;
import kr.co.devsign.devsign_backend.dto.fee.SaveFeeSettingRequest;
import kr.co.devsign.devsign_backend.entity.FeeRecord;
import kr.co.devsign.devsign_backend.entity.FeeSetting;
import kr.co.devsign.devsign_backend.entity.Member;
import kr.co.devsign.devsign_backend.repository.FeeRecordRepository;
import kr.co.devsign.devsign_backend.repository.FeeSettingRepository;
import kr.co.devsign.devsign_backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

// ✨ [2026-09-09 신규] 회비 관리 — 대상은 재학생/신입생.
// 핵심: 달마다 명단을 그 달 기준으로 고정(스냅샷)해두고, 이후에는 그 기록만 보고 화면을 그린다.
// 그래서 (1) 9월에 들어온 부원이 6월 명단에 끼어들지 않고 (2) 휴학/졸업으로 상태가 바뀌거나
// 계정이 삭제돼도 지난 달 기록과 걷힌 금액이 그대로 남는다.
@Service
@RequiredArgsConstructor
public class FeeService {

    private static final String STATUS_FRESHMAN = "신입생";
    private static final String STATUS_ATTENDING = "재학생";

    private final FeeSettingRepository feeSettingRepository;
    private final FeeRecordRepository feeRecordRepository;
    private final MemberRepository memberRepository;

    // 이번 달(또는 미래)을 처음 열면 지금 부원 명단이 곧 그 달의 명단이므로 자동으로 만들어준다.
    // 반대로 지난 달은 자동으로 만들지 않는다 — 지금 명단을 넣으면 그 달 기준이 아니게 되므로,
    // 관리자가 필요할 때만 직접 "명단 만들기"를 누르게 한다.
    @Transactional
    public FeeMonthResponse getMonth(int year, int month) {
        if (feeRecordRepository.findByYearAndMonthOrderByIdAsc(year, month).isEmpty()
                && !YearMonth.of(year, month).isBefore(YearMonth.now())) {
            addMissingTargets(year, month);
        }
        return buildResponse(year, month);
    }

    // 지난 달 명단을 관리자가 직접 만들거나, 이번 달에 새로 들어온 부원을 명단에 추가할 때.
    // 이미 있는 기록은 건드리지 않고 빠진 사람만 넣는다(납부 체크가 지워지지 않도록).
    @Transactional
    public FeeMonthResponse syncRoster(int year, int month) {
        addMissingTargets(year, month);
        return buildResponse(year, month);
    }

    @Transactional
    public FeeMonthResponse saveSetting(int year, int month, SaveFeeSettingRequest request) {
        FeeSetting setting = feeSettingRepository.findByYearAndMonth(year, month)
                .orElseGet(FeeSetting::new);
        setting.setYear(year);
        setting.setMonth(month);
        setting.setFreshmanAmount(request.freshmanAmount() != null ? Math.max(0, request.freshmanAmount()) : 0);
        setting.setAttendingAmount(request.attendingAmount() != null ? Math.max(0, request.attendingAmount()) : 0);
        feeSettingRepository.save(setting);

        return buildResponse(year, month);
    }

    @Transactional
    public FeeMonthResponse togglePaid(int year, int month, String loginId) {
        feeRecordRepository.findByYearAndMonthAndLoginId(year, month, loginId).ifPresent(r -> {
            r.setPaid(!r.isPaid());
            r.setPaidAt(r.isPaid() ? LocalDateTime.now() : null);
            feeRecordRepository.save(r);
        });
        return buildResponse(year, month);
    }

    // 잘못 추가된 사람을 그 달 명단에서 빼는 용도 (기록 자체를 지움)
    @Transactional
    public FeeMonthResponse removeFromRoster(int year, int month, String loginId) {
        feeRecordRepository.findByYearAndMonthAndLoginId(year, month, loginId)
                .ifPresent(feeRecordRepository::delete);
        return buildResponse(year, month);
    }

    private void addMissingTargets(int year, int month) {
        Set<String> existing = new HashSet<>();
        for (FeeRecord r : feeRecordRepository.findByYearAndMonthOrderByIdAsc(year, month)) {
            existing.add(r.getLoginId());
        }

        for (Member m : findCurrentTargets()) {
            if (existing.contains(m.getLoginId())) continue;
            FeeRecord record = new FeeRecord();
            record.setYear(year);
            record.setMonth(month);
            record.setLoginId(m.getLoginId());
            record.setName(m.getName());
            record.setStudentId(m.getStudentId());
            record.setUserStatus(m.getUserStatus());
            record.setPaid(false);
            feeRecordRepository.save(record);
        }
    }

    private FeeMonthResponse buildResponse(int year, int month) {
        FeeSetting setting = feeSettingRepository.findByYearAndMonth(year, month).orElse(null);
        int freshmanAmount = setting != null ? setting.getFreshmanAmount() : 0;
        int attendingAmount = setting != null ? setting.getAttendingAmount() : 0;

        List<FeeRecord> records = feeRecordRepository.findByYearAndMonthOrderByIdAsc(year, month);

        Set<String> currentTargetLoginIds = new HashSet<>();
        for (Member m : findCurrentTargets()) {
            currentTargetLoginIds.add(m.getLoginId());
        }

        List<FeeMonthResponse.FeeMemberResponse> members = new ArrayList<>();
        int paidCount = 0;
        long collectedAmount = 0L;

        for (FeeRecord r : records) {
            // 디스코드 태그만 현재 값을 쓴다 — DM 발송은 "지금" 연동된 계정으로 나가야 하므로
            Optional<Member> member = memberRepository.findByLoginId(r.getLoginId());

            members.add(new FeeMonthResponse.FeeMemberResponse(
                    r.getLoginId(),
                    StringUtils.hasText(r.getName()) ? r.getName() : r.getLoginId(),
                    r.getStudentId(),
                    StringUtils.hasText(r.getUserStatus()) ? r.getUserStatus() : STATUS_ATTENDING,
                    member.map(Member::getDiscordTag).orElse(null),
                    r.isPaid(),
                    !currentTargetLoginIds.contains(r.getLoginId())
            ));

            if (r.isPaid()) {
                paidCount++;
                collectedAmount += STATUS_FRESHMAN.equals(r.getUserStatus()) ? freshmanAmount : attendingAmount;
            }
        }

        return new FeeMonthResponse(
                year, month, freshmanAmount, attendingAmount,
                !records.isEmpty(), records.size(), paidCount, collectedAmount, members
        );
    }

    // 지금 시점의 회비 대상: 삭제되지 않고 "나간 인원"으로 표시되지 않은 재학생/신입생
    private List<Member> findCurrentTargets() {
        return memberRepository.findByDeletedFalseOrderByStudentIdDesc().stream()
                .filter(m -> !m.isDeparted())
                .filter(m -> STATUS_ATTENDING.equals(m.getUserStatus()) || STATUS_FRESHMAN.equals(m.getUserStatus()))
                .toList();
    }
}
