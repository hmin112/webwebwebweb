package kr.co.devsign.devsign_backend.service;

import kr.co.devsign.devsign_backend.dto.fee.FeeMonthResponse;
import kr.co.devsign.devsign_backend.dto.fee.SaveFeeSettingRequest;
import kr.co.devsign.devsign_backend.entity.FeePayment;
import kr.co.devsign.devsign_backend.entity.FeeSetting;
import kr.co.devsign.devsign_backend.entity.Member;
import kr.co.devsign.devsign_backend.repository.FeePaymentRepository;
import kr.co.devsign.devsign_backend.repository.FeeSettingRepository;
import kr.co.devsign.devsign_backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

// ✨ [2026-09-09 신규] 회비 관리 — 대상은 재학생/신입생만.
@Service
@RequiredArgsConstructor
public class FeeService {

    private static final String STATUS_FRESHMAN = "신입생";
    private static final String STATUS_ATTENDING = "재학생";

    private final FeeSettingRepository feeSettingRepository;
    private final FeePaymentRepository feePaymentRepository;
    private final MemberRepository memberRepository;

    public FeeMonthResponse getMonth(int year, int month) {
        FeeSetting setting = feeSettingRepository.findByYearAndMonth(year, month).orElse(null);
        int freshmanAmount = setting != null ? setting.getFreshmanAmount() : 0;
        int attendingAmount = setting != null ? setting.getAttendingAmount() : 0;

        Set<String> paidLoginIds = new HashSet<>();
        for (FeePayment p : feePaymentRepository.findByYearAndMonth(year, month)) {
            paidLoginIds.add(p.getLoginId());
        }

        List<Member> targets = findTargetMembers();

        List<FeeMonthResponse.FeeMemberResponse> members = targets.stream()
                .map(m -> new FeeMonthResponse.FeeMemberResponse(
                        m.getId(), m.getLoginId(), m.getName(), m.getStudentId(),
                        m.getUserStatus(), m.getDiscordTag(),
                        paidLoginIds.contains(m.getLoginId())
                ))
                .toList();

        int paidCount = 0;
        long collectedAmount = 0L;
        for (Member m : targets) {
            if (!paidLoginIds.contains(m.getLoginId())) continue;
            paidCount++;
            collectedAmount += STATUS_FRESHMAN.equals(m.getUserStatus()) ? freshmanAmount : attendingAmount;
        }

        return new FeeMonthResponse(
                year, month, freshmanAmount, attendingAmount,
                targets.size(), paidCount, collectedAmount, members
        );
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

        return getMonth(year, month);
    }

    // 체크하면 행을 만들고, 다시 누르면 행을 지운다. 응답으로 갱신된 집계를 그대로 돌려줘서
    // 프론트가 납부 인원수/걷힌 금액을 따로 계산하지 않아도 되게 함.
    @Transactional
    public FeeMonthResponse togglePayment(int year, int month, String loginId) {
        feePaymentRepository.findByYearAndMonthAndLoginId(year, month, loginId)
                .ifPresentOrElse(
                        feePaymentRepository::delete,
                        () -> {
                            FeePayment payment = new FeePayment();
                            payment.setYear(year);
                            payment.setMonth(month);
                            payment.setLoginId(loginId);
                            payment.setPaidAt(LocalDateTime.now());
                            feePaymentRepository.save(payment);
                        }
                );

        return getMonth(year, month);
    }

    // 회비 대상: 삭제되지 않고, "나간 인원"으로 표시되지 않은 재학생/신입생
    private List<Member> findTargetMembers() {
        return memberRepository.findByDeletedFalseOrderByStudentIdDesc().stream()
                .filter(m -> !m.isDeparted())
                .filter(m -> STATUS_ATTENDING.equals(m.getUserStatus()) || STATUS_FRESHMAN.equals(m.getUserStatus()))
                .toList();
    }
}
