
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop policy "Anyone can book" on public.bookings;
create policy "Anyone can create a booking" on public.bookings for insert to anon, authenticated
  with check (length(full_name) > 1 and length(email) > 3);
