/*
  # Enable Realtime for comments and likes tables

  Adds both tables to the Supabase Realtime publication so that
  INSERT and UPDATE events are broadcast to subscribed clients.
*/

ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE likes;
