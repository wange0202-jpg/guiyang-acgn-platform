-- ============================================================
-- 贵阳二次元Cosponsor交流平台 - Supabase 数据库重建 SQL
-- ⚠️ 会删除所有现有数据，再重新建表
-- 在 Supabase Dashboard > SQL Editor 中完整执行（一次性全部粘贴运行）
-- ============================================================

-- 按依赖顺序删表（cascade 会自动删掉关联的 policies）
drop table if exists public.likes cascade;
drop table if exists public.comments cascade;
drop table if exists public.follows cascade;
drop table if exists public.products cascade;
drop table if exists public.services cascade;
drop table if exists public.cos_works cascade;
drop table if exists public.conventions cascade;
drop table if exists public.posts cascade;
drop table if exists public.profiles cascade;

-- ============================================================
-- 1. 用户表 (profiles) —— 先建，其他表策略依赖它
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique not null,
  avatar_url text default '',
  role text check (role in ('user', 'admin')) default 'user',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select using (true);

create policy "Users can insert their own profile."
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile."
  on profiles for update using (auth.uid() = id);

-- ============================================================
-- 0. 帖子表 (posts) - 论坛讨论区
-- ============================================================
create table public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  content text default '',
  section text check (section in ('anime', 'manga', 'cos', 'discussion')) not null,
  images text[] default '{}',
  view_count int default 0,
  likes int default 0,
  comments_count int default 0,
  created_at timestamptz default now()
);

alter table public.posts enable row level security;

create policy "Posts are viewable by everyone."
  on posts for select using (true);

create policy "Authenticated users can create posts."
  on posts for insert with check (auth.role() = 'authenticated');

create policy "Authors and admins can update posts."
  on posts for update using (
    auth.uid() = user_id or
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Authors and admins can delete posts."
  on posts for delete using (
    auth.uid() = user_id or
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- 2. 漫展表 (conventions)
-- ============================================================
create table public.conventions (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  start_date date not null,
  end_date date not null,
  location text not null,
  organizer text not null,
  description text default '',
  images text[] default '{}',
  creator_id uuid references auth.users not null,
  creator_username text not null,
  is_hot boolean default false,
  view_count int default 0,
  likes int default 0,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending',
  created_at timestamptz default now()
);

alter table public.conventions enable row level security;

create policy "Conventions are viewable by everyone."
  on conventions for select using (true);

create policy "Authenticated users can create conventions."
  on conventions for insert with check (auth.role() = 'authenticated');

create policy "Creators and admins can update conventions."
  on conventions for update using (
    auth.uid() = creator_id or
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Creators and admins can delete conventions."
  on conventions for delete using (
    auth.uid() = creator_id or
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- 3. COS作品表 (cos_works)
-- ============================================================
create table public.cos_works (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  category text check (category in ('cos', 'hanfu', 'lolita', 'jk', 'kigurumi', 'teamBuilding')) not null,
  images text[] default '{}',
  description text default '',
  author_id uuid references auth.users not null,
  author_username text not null,
  author_avatar text default '',
  likes int default 0,
  view_count int default 0,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending',
  created_at timestamptz default now()
);

alter table public.cos_works enable row level security;

create policy "Cos works are viewable by everyone."
  on cos_works for select using (true);

create policy "Authenticated users can create cos works."
  on cos_works for insert with check (auth.role() = 'authenticated');

create policy "Authors and admins can update cos works."
  on cos_works for update using (
    auth.uid() = author_id or
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Authors and admins can delete cos works."
  on cos_works for delete using (
    auth.uid() = author_id or
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- 4. 服务表 (services)
-- ============================================================
create table public.services (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  category text check (category in ('makeup', 'wig', 'photographer', 'props')) not null,
  nickname text not null,
  avatar text default '',
  contact text not null,
  description text default '',
  price_range text default '',
  works text[] default '{}',
  rating numeric(2,1) default 5.0,
  review_count int default 0,
  provider_id uuid references auth.users not null,
  provider_username text not null,
  status text check (status in ('pending', 'approved', 'rejected')) default 'pending',
  created_at timestamptz default now()
);

alter table public.services enable row level security;

create policy "Services are viewable by everyone."
  on services for select using (true);

create policy "Authenticated users can create services."
  on services for insert with check (auth.role() = 'authenticated');

create policy "Providers and admins can update services."
  on services for update using (
    auth.uid() = provider_id or
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Providers and admins can delete services."
  on services for delete using (
    auth.uid() = provider_id or
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- 5. 商品表 (products)
-- ============================================================
create table public.products (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  category text check (category in ('costume', 'wig', 'props', 'merchandise')) not null,
  price numeric(10,2) not null,
  condition text check (condition in ('全新', '几乎全新', '轻微使用痕迹', '有明显使用痕迹')) not null,
  images text[] default '{}',
  description text default '',
  seller_id uuid references auth.users not null,
  seller_username text not null,
  seller_avatar text default '',
  shipping text default '',
  view_count int default 0,
  status text check (status in ('pending', 'approved', 'rejected', 'sold')) default 'pending',
  created_at timestamptz default now()
);

alter table public.products enable row level security;

create policy "Products are viewable by everyone."
  on products for select using (true);

create policy "Authenticated users can create products."
  on products for insert with check (auth.role() = 'authenticated');

create policy "Sellers and admins can update products."
  on products for update using (
    auth.uid() = seller_id or
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Sellers and admins can delete products."
  on products for delete using (
    auth.uid() = seller_id or
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- 6. 评论表 (comments)
-- ============================================================
create table public.comments (
  id uuid default gen_random_uuid() primary key,
  target_id uuid not null,
  target_type text check (target_type in ('post', 'cos_work', 'service', 'product')) not null,
  content text not null,
  author_id uuid references auth.users not null,
  author_username text not null,
  author_avatar text default '',
  created_at timestamptz default now()
);

alter table public.comments enable row level security;

create policy "Comments are viewable by everyone."
  on comments for select using (true);

create policy "Authenticated users can create comments."
  on comments for insert with check (auth.role() = 'authenticated');

create policy "Authors and admins can delete comments."
  on comments for delete using (
    auth.uid() = author_id or
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- 7. 点赞表 (likes)
-- ============================================================
create table public.likes (
  id uuid default gen_random_uuid() primary key,
  target_id uuid not null,
  target_type text check (target_type in ('post', 'convention', 'cos_work', 'service', 'product')) not null,
  user_id uuid references auth.users not null,
  created_at timestamptz default now(),
  unique(target_id, user_id)
);

alter table public.likes enable row level security;

create policy "Likes are viewable by everyone."
  on likes for select using (true);

create policy "Authenticated users can like."
  on likes for insert with check (auth.role() = 'authenticated');

create policy "Users can unlike their own likes."
  on likes for delete using (auth.uid() = user_id);

-- ============================================================
-- 8. 关注表 (follows)
-- ============================================================
create table public.follows (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid references auth.users not null,
  following_id uuid references auth.users not null,
  created_at timestamptz default now(),
  unique(follower_id, following_id)
);

alter table public.follows enable row level security;

create policy "Follows are viewable by everyone."
  on follows for select using (true);

create policy "Authenticated users can follow."
  on follows for insert with check (auth.role() = 'authenticated');

create policy "Users can unfollow."
  on follows for delete using (auth.uid() = follower_id);

-- ============================================================
-- 索引优化
-- ============================================================
create index idx_posts_created_at on posts(created_at desc);
create index idx_conventions_created_at on conventions(created_at desc);
create index idx_cos_works_created_at on cos_works(created_at desc);
create index idx_services_created_at on services(created_at desc);
create index idx_products_created_at on products(created_at desc);
create index idx_comments_target_id on comments(target_id);
create index idx_likes_target_id on likes(target_id);
create index idx_follows_follower on follows(follower_id);
create index idx_follows_following on follows(following_id);

select 'Database rebuilt successfully! 🎉' as result;
