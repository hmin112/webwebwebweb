package kr.co.devsign.devsign_backend.controller;

import kr.co.devsign.devsign_backend.dto.chosun.ChosunProgramResponse;
import kr.co.devsign.devsign_backend.service.ChosunProgramService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/chosun-programs")
@RequiredArgsConstructor
public class ChosunProgramController {

    private final ChosunProgramService chosunProgramService;

    @GetMapping
    public List<ChosunProgramResponse> getPrograms() {
        return chosunProgramService.getPrograms();
    }
}
