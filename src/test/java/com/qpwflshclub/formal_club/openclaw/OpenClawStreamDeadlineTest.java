package com.qpwflshclub.formal_club.openclaw;

import static org.junit.jupiter.api.Assertions.*;

import java.io.*;
import java.time.Duration;
import org.junit.jupiter.api.Test;

class OpenClawStreamDeadlineTest {

    @Test
    void stalledBodyIsClosedAndReportsTimeout() {
        assertTimeoutPreemptively(Duration.ofSeconds(2), () -> {
            InputStream stalled = new InputStream() {
                boolean closed;

                public synchronized int read() throws IOException {
                    while (!closed) {
                        try {
                            wait();
                        } catch (InterruptedException e) {
                            throw new IOException(e);
                        }
                    }
                    return -1;
                }

                public synchronized void close() {
                    closed = true;
                    notifyAll();
                }
            };
            try (
                var stream = new OpenClawStreamDeadline(
                    stalled,
                    Duration.ofMillis(40),
                    Duration.ofSeconds(1)
                )
            ) {
                assertTrue(
                    assertThrows(IOException.class, stream::read).getMessage().contains("timeout")
                );
            }
        });
    }

    @Test
    void normalBodyCanBeReadAndClosed() throws Exception {
        try (
            var stream = new OpenClawStreamDeadline(
                new ByteArrayInputStream("hello".getBytes()),
                Duration.ofSeconds(1),
                Duration.ofSeconds(2)
            )
        ) {
            assertEquals("hello", new String(stream.readAllBytes()));
        }
    }

    @Test
    void doneMarkerEndsRoundEvenWhenUpstreamKeepsConnectionOpen() throws Exception {
        var server = com.sun.net.httpserver.HttpServer.create(
            new java.net.InetSocketAddress("127.0.0.1", 0),
            0
        );
        var release = new java.util.concurrent.CountDownLatch(1);
        server.createContext("/v1/chat/completions", exchange -> {
            exchange.getRequestBody().readAllBytes();
            exchange.sendResponseHeaders(200, 0);
            exchange
                .getResponseBody()
                .write(
                    "data: {\"choices\":[{\"delta\":{\"content\":\"hello\"}}]}\n\ndata: [DONE]\n\n".getBytes()
                );
            exchange.getResponseBody().flush();
            try {
                release.await(5, java.util.concurrent.TimeUnit.SECONDS);
            } catch (InterruptedException ignored) {}
            exchange.close();
        });
        server.start();
        try {
            var gateway = new OpenClawGateway(
                new com.fasterxml.jackson.databind.ObjectMapper(),
                "http://127.0.0.1:" + server.getAddress().getPort(),
                "test"
            );
            assertTimeoutPreemptively(Duration.ofSeconds(2), () -> {
                var round = gateway.complete(
                    "test",
                    "deepseek/flash",
                    java.util.List.of(),
                    java.util.List.of(),
                    s -> {},
                    s -> {}
                );
                assertEquals("hello", round.content);
            });
        } finally {
            release.countDown();
            server.stop(0);
        }
    }
}
