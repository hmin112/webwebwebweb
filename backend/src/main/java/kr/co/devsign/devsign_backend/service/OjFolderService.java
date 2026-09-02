package kr.co.devsign.devsign_backend.service;

import kr.co.devsign.devsign_backend.entity.OjFolder;
import kr.co.devsign.devsign_backend.repository.OjFolderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class OjFolderService {

    private final OjFolderRepository ojFolderRepository;

    public List<String> getAllFolderPaths() {
        return ojFolderRepository.findAll().stream().map(OjFolder::getPath).toList();
    }

    @Transactional
    public void createFolder(String path) {
        if (ojFolderRepository.findByPath(path).isEmpty()) {
            OjFolder folder = new OjFolder();
            folder.setPath(path);
            ojFolderRepository.save(folder);
        }
    }

    @Transactional
    public void deleteFolder(String path) {
        ojFolderRepository.findByPath(path).ifPresent(ojFolderRepository::delete);
    }

    // 폴더 이름 변경 시 레지스트리에 등록된(빈) 폴더들의 경로도 함께 갱신
    @Transactional
    public void renamePath(String oldPath, String newPath) {
        String oldPrefix = oldPath + "/";
        List<OjFolder> all = ojFolderRepository.findAll();
        for (OjFolder folder : all) {
            if (folder.getPath().equals(oldPath)) {
                folder.setPath(newPath);
            } else if (folder.getPath().startsWith(oldPrefix)) {
                folder.setPath(newPath + folder.getPath().substring(oldPath.length()));
            }
        }
        ojFolderRepository.saveAll(all);
    }
}
