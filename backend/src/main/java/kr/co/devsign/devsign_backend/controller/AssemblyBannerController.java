package kr.co.devsign.devsign_backend.controller;

import kr.co.devsign.devsign_backend.dto.assembly.AssemblyBannerResponse;
import kr.co.devsign.devsign_backend.dto.assembly.SaveAssemblyBannerRequest;
import kr.co.devsign.devsign_backend.service.AssemblyBannerService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// ✨ [2026-09-08 신규] "총회 배너" 편집 — /api/admin/** 아래에 있어 SecurityConfig에서 이미
// ADMIN 권한이 강제됨(별도 매처 추가 불필요)
@RestController
@RequestMapping("/api/admin/assembly-banners")
@RequiredArgsConstructor
public class AssemblyBannerController {

    private final AssemblyBannerService assemblyBannerService;

    @GetMapping("/{year}")
    public List<AssemblyBannerResponse> getBannersByYear(@PathVariable int year) {
        return assemblyBannerService.getBannersByYear(year);
    }

    @GetMapping("/{year}/{month}")
    public AssemblyBannerResponse getBanner(@PathVariable int year, @PathVariable int month) {
        return assemblyBannerService.getBanner(year, month);
    }

    @PutMapping("/{year}/{month}")
    public AssemblyBannerResponse saveBanner(
            @PathVariable int year,
            @PathVariable int month,
            @RequestBody SaveAssemblyBannerRequest request
    ) {
        return assemblyBannerService.saveBanner(year, month, request);
    }
}
