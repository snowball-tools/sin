; nasm -f win64 sinx.asm -o sinx.obj
; gcc -nostdlib sinx.obj -o sinx.exe -lkernel32
; strip --strip-all sinx.exe
; upx --best sinx.exe

default rel

extern GetModuleFileNameA
extern GetCommandLineA
extern CreateFileA
extern ReadFile
extern CloseHandle
extern CreateProcessA
extern WaitForSingleObject
extern ExitProcess

section .data
    cmd_buffer: times 2048 db 0
    module_filename: times 260 db 0
    file_content: times 1024 db 0

    access_read: dd 0x80000000
    share_read: dd 1
    open_existing: dd 3
    file_attrs: dd 0

section .bss
    bytes_read: resd 1

section .text
global main
main:
    sub rsp, 208

    xor rcx, rcx
    lea rdx, [rel module_filename]
    mov r8d, 260
    call GetModuleFileNameA

    lea rsi, [rel module_filename]
    lea rdi, [rel module_filename]
find_end:
    mov al, [rsi]
    cmp al, 0
    je remove_ext
    inc rsi
    jmp find_end
remove_ext:
    dec rsi
search_dot:
    cmp rsi, rdi
    jb build_cmd
    cmp byte [rsi], '.'
    je truncate_ext
    dec rsi
    jmp search_dot
truncate_ext:
    mov byte [rsi], 0

build_cmd:
    lea rcx, [rel module_filename]
    mov edx, [rel access_read]
    mov r8d, [rel share_read]
    xor r9d, r9d

    sub rsp, 32

    mov eax, [rel open_existing]
    mov dword [rsp + 32], eax
    mov eax, [rel file_attrs]
    mov dword [rsp + 40], eax
    mov qword [rsp + 48], 0

    call CreateFileA

    add rsp, 32

    cmp rax, -1
    je exit

    mov rbx, rax

    mov rcx, rbx
    lea rdx, [rel file_content]
    mov r8d, 1024
    lea r9, [rel bytes_read]

    sub rsp, 40
    mov qword [rsp + 32], 0

    call ReadFile

    add rsp, 40

    mov rcx, rbx
    call CloseHandle

    test eax, eax
    je exit

    mov eax, [rel bytes_read]
    cmp eax, 0
    je exit

    lea rsi, [rel file_content]
    lea rdi, [rel cmd_buffer]
    mov ecx, eax
    rep movsb

    mov byte [rdi], 0

    call GetCommandLineA
    mov rsi, rax

    mov al, [rsi]
    cmp al, '"'
    je skip_quoted
    jmp skip_unquoted

skip_quoted:
    inc rsi
skip_quoted_loop:
    mov al, [rsi]
    cmp al, 0
    je no_args
    cmp al, '"'
    je after_exe_quote
    inc rsi
    jmp skip_quoted_loop

after_exe_quote:
    inc rsi
    jmp skip_spaces

skip_unquoted:
    cmp al, 0
    je no_args
skip_unquoted_loop:
    cmp al, ' '
    je after_exe_unquoted
    cmp al, 0
    je no_args
    inc rsi
    mov al, [rsi]
    jmp skip_unquoted_loop

after_exe_unquoted:
    inc rsi

skip_spaces:
skip_spaces_loop:
    mov al, [rsi]
    cmp al, ' '
    jne check_end_args
    cmp al, 0
    je no_args
    inc rsi
    jmp skip_spaces_loop

check_end_args:
    cmp al, 0
    je no_args
    jmp copy_args

copy_args:
    mov byte [rdi], ' '
    inc rdi

copy_args_loop:
    mov al, [rsi]
    cmp al, 0
    je end_args
    mov [rdi], al
    inc rdi
    inc rsi
    jmp copy_args_loop

end_args:
    mov byte [rdi], 0
    jmp proceed_create_process

no_args:
    mov byte [rdi], 0
    jmp proceed_create_process

proceed_create_process:
    lea rdi, [rsp + 80]
    mov rcx, 16
    xor rax, rax
    rep stosq

    mov dword [rsp + 144], 104

    xor rcx, rcx
    lea rdx, [rel cmd_buffer]
    xor r8, r8
    xor r9, r9

    mov qword [rsp + 32], 0
    mov qword [rsp + 40], 0
    mov qword [rsp + 48], 0
    mov qword [rsp + 56], 0
    lea rax, [rsp + 144]
    mov [rsp + 64], rax
    lea rax, [rsp + 80]
    mov [rsp + 72], rax

    call CreateProcessA

    test eax, eax
    je exit

    mov rcx, [rsp + 80]
    mov edx, -1
    call WaitForSingleObject

    mov rcx, [rsp + 80]
    call CloseHandle
    mov rcx, [rsp + 88]
    call CloseHandle

exit:
    xor ecx, ecx
    add rsp, 208
    call ExitProcess
