package com.qpwflshclub.formal_club.repository.User;

import com.qpwflshclub.formal_club.pojo.User.Admin;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AdminRepository extends CrudRepository<Admin, Long> {
    Optional<Admin> findByAdminNameEn(String adminNameEn);
}
