-- Clears posts and book-related rows, then truncates Books.
-- WARNING: Deletes ALL rows from PostLikes, PostComments, FavoritePosts, Posts, BookComments, UserBooks.
BEGIN;

SET LOCAL lock_timeout = '30s';
SET LOCAL statement_timeout = '0';

DELETE FROM crud."PostLikes";
DELETE FROM crud."PostComments";
DELETE FROM crud."FavoritePosts";
DELETE FROM crud."Posts";
DELETE FROM crud."BookComments";
DELETE FROM crud."UserBooks";

TRUNCATE TABLE crud."Books" RESTART IDENTITY;
