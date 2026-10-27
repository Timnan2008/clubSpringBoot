package com.qpwflshclub.formal_club.openclaw;

import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

/** HttpRequest.timeout stops at response headers with ofInputStream; bound the body too. */
final class OpenClawStreamDeadline extends FilterInputStream {

    private static final ScheduledExecutorService CLOCK = Executors.newScheduledThreadPool(2, r -> {
        Thread thread = new Thread(r, "openclaw-stream-deadline");
        thread.setDaemon(true);
        return thread;
    });
    private final long started = System.nanoTime();
    private volatile long lastRead = started;
    private volatile boolean expired;
    private final ScheduledFuture<?> watch;

    OpenClawStreamDeadline(InputStream input, Duration idle, Duration total) {
        super(input);
        long idleNanos = idle.toNanos(),
            totalNanos = total.toNanos();
        Thread owner = Thread.currentThread();
        watch = CLOCK.scheduleAtFixedRate(
            () -> {
                long now = System.nanoTime();
                if (
                    owner.isInterrupted() ||
                    now - lastRead >= idleNanos ||
                    now - started >= totalNanos
                ) {
                    expired = true;
                    try {
                        input.close();
                    } catch (IOException ignored) {}
                }
            },
            10,
            Math.max(10, Math.min(1000, idle.toMillis() / 2)),
            TimeUnit.MILLISECONDS
        );
    }

    private void check() throws IOException {
        if (expired) throw new IOException("stream timeout");
    }

    @Override
    public int read(byte[] b, int off, int len) throws IOException {
        check();
        int count;
        try {
            count = in.read(b, off, len);
        } catch (IOException error) {
            check();
            throw error;
        }
        check();
        if (count > 0) lastRead = System.nanoTime();
        return count;
    }

    @Override
    public int read() throws IOException {
        byte[] one = new byte[1];
        return read(one, 0, 1) < 0 ? -1 : one[0] & 255;
    }

    @Override
    public void close() throws IOException {
        watch.cancel(false);
        super.close();
    }
}
