package com.qpwflshclub.formal_club.Util;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFileAttributeView;
import java.nio.file.attribute.PosixFilePermissions;

/** Applies owner-only permissions on file systems that support POSIX attributes. */
public final class SecureFiles {

    private SecureFiles() {}

    public static void restrict(Path path, String permissions) throws IOException {
        PosixFileAttributeView view = Files.getFileAttributeView(
            path,
            PosixFileAttributeView.class
        );
        if (view != null) {
            view.setPermissions(PosixFilePermissions.fromString(permissions));
        }
    }
}
