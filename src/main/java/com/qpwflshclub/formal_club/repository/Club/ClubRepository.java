package com.qpwflshclub.formal_club.repository.Club;

import com.qpwflshclub.formal_club.pojo.Club.Club;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ClubRepository extends CrudRepository<Club, Integer> {

    Optional<Club> findByClubNameEn(String clubName);
}
