let SessionLoad = 1
let s:so_save = &g:so | let s:siso_save = &g:siso | setg so=0 siso=0 | setl so=-1 siso=-1
let v:this_session=expand("<sfile>:p")
silent only
silent tabonly
cd ~/1_projects/probe/lswt-playground
if expand('%') == '' && !&modified && line('$') <= 1 && getline(1) == ''
  let s:wipebuf = bufnr('%')
endif
let s:shortmess_save = &shortmess
if &shortmess =~ 'A'
  set shortmess=aoOA
else
  set shortmess=aoO
endif
badd +269 app/components/SegmentFactorMatrix.vue
badd +82 app/components/MutationMainView.vue
badd +330 app/components/SegmentsSideView.vue
badd +38 app/components/SegmentStatsTable.vue
badd +16 app/components/ParamsPreprocess.vue
argglobal
%argdel
edit app/components/SegmentFactorMatrix.vue
wincmd t
let s:save_winminheight = &winminheight
let s:save_winminwidth = &winminwidth
set winminheight=0
set winheight=1
set winminwidth=0
set winwidth=1
argglobal
balt app/components/SegmentsSideView.vue
setlocal foldmethod=expr
setlocal foldexpr=v:lua.vim.treesitter.foldexpr()
setlocal foldmarker={{{,}}}
setlocal foldignore=#
setlocal foldlevel=99
setlocal foldminlines=1
setlocal foldnestmax=20
setlocal foldenable
338
sil! normal! zo
339
sil! normal! zo
345
sil! normal! zo
349
sil! normal! zo
354
sil! normal! zo
364
sil! normal! zo
369
sil! normal! zo
370
sil! normal! zo
382
sil! normal! zo
387
sil! normal! zo
388
sil! normal! zo
399
sil! normal! zo
403
sil! normal! zo
404
sil! normal! zo
409
sil! normal! zo
430
sil! normal! zo
434
sil! normal! zo
435
sil! normal! zo
440
sil! normal! zo
469
sil! normal! zo
475
sil! normal! zo
482
sil! normal! zo
let s:l = 269 - ((18 * winheight(0) + 17) / 34)
if s:l < 1 | let s:l = 1 | endif
keepjumps exe s:l
normal! zt
keepjumps 269
normal! 046|
tabnext 1
if exists('s:wipebuf') && len(win_findbuf(s:wipebuf)) == 0 && getbufvar(s:wipebuf, '&buftype') isnot# 'terminal'
  silent exe 'bwipe ' . s:wipebuf
endif
unlet! s:wipebuf
set winheight=1 winwidth=20
let &shortmess = s:shortmess_save
let &winminheight = s:save_winminheight
let &winminwidth = s:save_winminwidth
let s:sx = expand("<sfile>:p:r")."x.vim"
if filereadable(s:sx)
  exe "source " . fnameescape(s:sx)
endif
let &g:so = s:so_save | let &g:siso = s:siso_save
set hlsearch
doautoall SessionLoadPost
unlet SessionLoad
" vim: set ft=vim :
