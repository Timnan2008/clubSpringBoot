package com.qpwflshclub.formal_club.repository;

import com.qpwflshclub.formal_club.pojo.Club;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClubRepository extends CrudRepository<Club, Integer> {

    Club findByClubNameEn(String clubName);
}
