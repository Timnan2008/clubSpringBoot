package com.qpwflshclub.formal_club.User.repository;

import com.qpwflshclub.formal_club.User.pojo.Admin;
import java.util.Optional;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AdminRepository extends CrudRepository<Admin, Long> {
    Optional<Admin> findByAdminNameEn(String adminNameEn);
    Admin findByAdminEmail(String adminEmail);
}
