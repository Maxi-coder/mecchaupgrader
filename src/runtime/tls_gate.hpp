#pragma once

#include <Windows.h>
#include <atomic>
#include <cstdint>

#include "platform/vmp.hpp"

namespace tls_gate {
    inline constexpr uint64_t magic = 0x4E4354585F544C53ull;

#pragma pack(push, 1)
    struct init_data {
        uint64_t magic_value;
        uint8_t encrypted_init[64];
        uint32_t stage;
    };
#pragma pack(pop)

#pragma section(".ncttls", read, write)
    __declspec(allocate(".ncttls")) inline volatile init_data g_init_data {
        magic,
        {},
        0,
    };

    inline std::atomic<bool> g_required{ false };
    inline std::atomic<bool> g_failed{ false };
    inline std::atomic<uintptr_t> g_module_base{ 0 };

    inline bool data_valid() {
        return g_init_data.magic_value == magic;
    }

    inline bool required() {
        return g_required.load(std::memory_order_acquire);
    }

    inline bool failed() {
        return g_failed.load(std::memory_order_acquire);
    }

    inline uint32_t stage() {
        return g_init_data.stage;
    }

    inline void mark_failed() {
        g_failed.store(true, std::memory_order_release);
    }

    inline void set_stage(uint32_t value) {
        g_init_data.stage = value;
    }

    inline uintptr_t module_base() {
        return g_module_base.load(std::memory_order_acquire);
    }

    inline void process_attach(HMODULE module) {
        NOCTUA_VMP_SCOPE_ULTRA("tls_gate.process_attach");
        g_module_base.store(reinterpret_cast<uintptr_t>(module), std::memory_order_release);
        g_required.store(data_valid(), std::memory_order_release);
        if (!data_valid()) {
            mark_failed();
        }
    }
}

#if defined(NOCTUA_TLS_GATE_IMPLEMENTATION)
extern "C" void NTAPI noctua_tls_callback(PVOID module, DWORD reason, PVOID) {
    if (reason == DLL_PROCESS_ATTACH) {
        tls_gate::process_attach(static_cast<HMODULE>(module));
    }
}

#ifdef _M_X64
#pragma comment(linker, "/INCLUDE:_tls_used")
#pragma comment(linker, "/INCLUDE:noctua_tls_callback_anchor")
#else
#pragma comment(linker, "/INCLUDE:__tls_used")
#pragma comment(linker, "/INCLUDE:_noctua_tls_callback_anchor")
#endif

#pragma section(".CRT$XLB", long, read)
extern "C" __declspec(allocate(".CRT$XLB")) PIMAGE_TLS_CALLBACK noctua_tls_callback_anchor = noctua_tls_callback;
#endif
