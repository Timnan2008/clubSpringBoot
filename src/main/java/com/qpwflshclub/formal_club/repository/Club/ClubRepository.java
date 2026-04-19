package com.qpwflshclub.formal_club.repository.Club;

import java.util.List;

@Repository
public interface ClubRepository extends CrudRepository<Club, Integer> {
    Optional<Club> findByClubNameEn(String clubName);

    List<Club> findByClubNameContainingOrClubDescriptionContainingOrClubNameEnContainingOrClubDescriptionEnContaining(
        String clubName, String clubDescription, String clubNameEn, String clubDescriptionEn);
}
