package com.qpwflshclub.formal_club.service.Club;
import com.qpwflshclub.formal_club.pojo.Club.Club;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class PublicClubCatalogTest {
    private Club club(){Club c=new Club();c.setId(1);c.setClubName("编程社");c.setClubNameEn("Codecraft");c.setClubDescriptionEn("Build together");return c;}
    @Test void sharesOneDatabaseReadAcrossConcurrentListAndSearchRequests() throws Exception {
        IClubService source=mock(IClubService.class);when(source.findAll()).thenReturn(List.of(club()));
        PublicClubCatalog catalog=new PublicClubCatalog(source);
        try(var pool=Executors.newVirtualThreadPerTaskExecutor()) {
            List<Callable<Integer>> calls=new ArrayList<>();
            for(int i=0;i<500;i++){final int n=i;calls.add(()->n%2==0?catalog.all().size():catalog.search("BUILD").size());}
            for(var result:pool.invokeAll(calls))assertThat(result.get()).isEqualTo(1);
        }
        verify(source,times(1)).findAll();
    }
    @Test void snapshotsAreIsolatedFromEntityAndResponseMutationsAndRefreshAfterExpiry() {
        IClubService source=mock(IClubService.class);Clock clock=mock(Clock.class);when(clock.millis()).thenReturn(1000L);
        Club entity=club();when(source.findAll()).thenReturn(List.of(entity));PublicClubCatalog catalog=new PublicClubCatalog(source,clock);
        catalog.all().getFirst().setClubName("response mutation");entity.setClubName("新名称");
        assertThat(catalog.all().getFirst().getClubName()).isEqualTo("编程社");
        when(clock.millis()).thenReturn(3001L);
        assertThat(catalog.all().getFirst().getClubName()).isEqualTo("新名称");verify(source,times(2)).findAll();
    }
    @Test void languageQueriesShareDataWithoutCachingLocaleAndBlankQueriesDoNotReadDatabase() {
        IClubService source=mock(IClubService.class);PublicClubCatalog catalog=new PublicClubCatalog(source);
        assertThat(catalog.search(null)).isEmpty();assertThat(catalog.search(" ")).isEmpty();verifyNoInteractions(source);
        when(source.findAll()).thenReturn(List.of(club()));
        assertThat(catalog.search("编程")).hasSize(1);assertThat(catalog.search("codeCRAFT")).hasSize(1);
        assertThat(catalog.search("%" )).isEmpty();assertThat(catalog.all().getFirst().getClubName()).isEqualTo("编程社");
        verify(source,times(1)).findAll();
    }
}
