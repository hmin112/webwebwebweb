package kr.co.devsign.devsign_backend.service;

import kr.co.devsign.devsign_backend.dto.assembly.AssemblyBannerResponse;
import kr.co.devsign.devsign_backend.dto.assembly.SaveAssemblyBannerRequest;
import kr.co.devsign.devsign_backend.entity.AssemblyBanner;
import kr.co.devsign.devsign_backend.repository.AssemblyBannerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

// ✨ [2026-09-08 신규] 관리자용 "총회 배너" 편집 — 학기 운영월(3,4,5,6,9,10,11,12)마다 하나씩,
// 없으면 빈 기본값으로 채워서 항상 8개월 전체를 돌려준다(AdminPeriodTab의 제출/자료 탭과 동일한 패턴).
@Service
@RequiredArgsConstructor
public class AssemblyBannerService {

    private static final int[] ACTIVE_MONTHS = new int[]{3, 4, 5, 6, 9, 10, 11, 12};

    private final AssemblyBannerRepository assemblyBannerRepository;

    public List<AssemblyBannerResponse> getBannersByYear(int year) {
        Map<Integer, AssemblyBanner> byMonth = assemblyBannerRepository.findByYearOrderByMonthAsc(year).stream()
                .collect(Collectors.toMap(AssemblyBanner::getMonth, b -> b, (a, b) -> a));

        List<AssemblyBannerResponse> result = new ArrayList<>();
        for (int month : ACTIVE_MONTHS) {
            AssemblyBanner banner = byMonth.get(month);
            result.add(banner != null ? toResponse(banner) : emptyResponse(year, month));
        }
        return result;
    }

    public AssemblyBannerResponse getBanner(int year, int month) {
        return assemblyBannerRepository.findByYearAndMonth(year, month)
                .map(this::toResponse)
                .orElseGet(() -> emptyResponse(year, month));
    }

    @Transactional
    public AssemblyBannerResponse saveBanner(int year, int month, SaveAssemblyBannerRequest request) {
        AssemblyBanner banner = assemblyBannerRepository.findByYearAndMonth(year, month)
                .orElseGet(AssemblyBanner::new);

        banner.setYear(year);
        banner.setMonth(month);
        banner.setTitle(request.title());
        banner.setNotices(request.notices() != null ? request.notices() : new ArrayList<>());
        banner.setAgenda(request.agenda() != null ? request.agenda() : new ArrayList<>());
        banner.setAttendanceCount(request.attendanceCount());
        banner.setQuote(request.quote());
        banner.setTargetEndTime(request.targetEndTime());
        banner.setNextAssemblyLabel(request.nextAssemblyLabel());
        banner.setNextAssemblyDate(request.nextAssemblyDate());
        banner.setUpdatedAt(LocalDateTime.now());

        return toResponse(assemblyBannerRepository.save(banner));
    }

    private AssemblyBannerResponse toResponse(AssemblyBanner b) {
        return new AssemblyBannerResponse(
                b.getId(), b.getYear(), b.getMonth(), b.getTitle(),
                b.getNotices(), b.getAgenda(), b.getAttendanceCount(), b.getQuote(),
                b.getTargetEndTime(), b.getNextAssemblyLabel(), b.getNextAssemblyDate()
        );
    }

    private AssemblyBannerResponse emptyResponse(int year, int month) {
        return new AssemblyBannerResponse(
                null, year, month, null,
                new ArrayList<>(), new ArrayList<>(), null, null,
                null, null, null
        );
    }
}
