package com.qpwflshclub.formal_club.repository.User;

import com.qpwflshclub.formal_club.pojo.User.ClubPresident;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ClubPresidentRepository extends CrudRepository<ClubPresident, Long> {
    Optional<ClubPresident> findByClubPresidentNameEn(String clubPresidentName);
}
