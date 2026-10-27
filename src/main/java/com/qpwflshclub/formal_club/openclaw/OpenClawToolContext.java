package com.qpwflshclub.formal_club.openclaw;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import java.util.function.Supplier;
import org.springframework.orm.jpa.EntityManagerHolder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Gives detached workers a persistence context for one tool, without extending write transactions. */
@Component
public class OpenClawToolContext {
    private final EntityManagerFactory factory;

    public OpenClawToolContext(EntityManagerFactory factory) {
        this.factory = factory;
    }

    public <T> T run(Supplier<T> action) {
        if (TransactionSynchronizationManager.hasResource(factory)) return action.get();
        EntityManager manager = factory.createEntityManager();
        TransactionSynchronizationManager.bindResource(factory, new EntityManagerHolder(manager));
        try {
            return action.get();
        } finally {
            TransactionSynchronizationManager.unbindResource(factory);
            manager.close();
        }
    }
}
