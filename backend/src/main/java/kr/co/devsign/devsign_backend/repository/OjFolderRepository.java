package kr.co.devsign.devsign_backend.repository;

import kr.co.devsign.devsign_backend.entity.OjFolder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OjFolderRepository extends JpaRepository<OjFolder, Long> {
    Optional<OjFolder> findByPath(String path);
}
