package com.qpwflshclub.formal_club.openclaw;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionSynchronizationManager;

class OpenClawToolContextTest {
    @Test
    void backgroundContextIsSharedByNestedCallsAndReleasedAfterFailure() {
        EntityManagerFactory factory = mock(EntityManagerFactory.class);
        EntityManager manager = mock(EntityManager.class);
        when(factory.createEntityManager()).thenReturn(manager);
        OpenClawToolContext context = new OpenClawToolContext(factory);
        assertThrows(IllegalStateException.class, () -> context.run(() -> {
            assertTrue(TransactionSynchronizationManager.hasResource(factory));
            assertFalse(TransactionSynchronizationManager.isActualTransactionActive());
            context.run(() -> {
                assertTrue(TransactionSynchronizationManager.hasResource(factory));
                return null;
            });
            verify(manager, never()).close();
            throw new IllegalStateException("tool conflict");
        }));
        assertFalse(TransactionSynchronizationManager.hasResource(factory));
        verify(factory, times(1)).createEntityManager();
        verify(manager).close();
    }
}
