package com.qpwflshclub.formal_club.User.repository;

import com.qpwflshclub.formal_club.User.pojo.Admin;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AdminRepository extends CrudRepository<Admin, Long> {
    Optional<Admin> findByAdminNameEn(String adminNameEn);
    Admin findByAdminEmail(String adminEmail);

    @Query("select distinct a from Admin a left join fetch a.clubs")
    List<Admin> findAllWithClubs();
}
