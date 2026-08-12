#include "runtime/init.hpp"

#include "core/imports.h"
#include "executor/executor.hpp"
#include "features/misc/freecam.hpp"
#include "network/ws_bridge.hpp"
#include "platform/build_profile.hpp"
#include "platform/crash_logger.hpp"
#include "platform/debug.hpp"
#include "platform/vmp.hpp"
#include "runtime/context.hpp"
#include "runtime/session.hpp"
#include "runtime/tasks.hpp"
#include "runtime/tls_gate.hpp"

#include <cstdio>
#include <ctime>

#pragma comment(lib, "winmm.lib")

namespace {
    bool g_initialized = false;

    void patch_wnd_proc() {
        __try {
            hook::patch_wndproc();
        } __except(EXCEPTION_EXECUTE_HANDLER) {
            NOCTUA_RUNTIME_LOG("SEH: patch_wndproc 0x%08X", GetExceptionCode());
        }
    }

    bool initialize_release_runtime() {
        NOCTUA_VMP_SCOPE_ULTRA("initialize_release_runtime");
        runtime_context::context_view context{};
        if (!runtime_context::read(context)) {
            if constexpr (build_profile::debug) {
                NOCTUA_RUNTIME_LOG("debug runtime: offline direct-inject mode");
                return true;
            }
            NOCTUA_RUNTIME_LOG("release runtime failed: context read failed");
            return false;
        }

        NOCTUA_RUNTIME_LOG(
            "runtime context: session_len=%zu product=%s tg_len=%zu hwid_len=%zu seed_empty=%d",
            context.product_session.size(),
            context.product_code.c_str(),
            context.tg_id.size(),
            context.hwid.size(),
            runtime_context::seed_is_empty(context.context_seed) ? 1 : 0
        );

        runtime_session::state session{};
        session.ready = true;
        strncpy_s(session.product_session, context.product_session.c_str(), _TRUNCATE);
        strncpy_s(session.product_code, context.product_code.empty() ? "altv" : context.product_code.c_str(), _TRUNCATE);
        strncpy_s(session.hwid, context.hwid.c_str(), _TRUNCATE);
        session.runtime_seed = context.context_seed;
        session.pointer_xor_seed = context.context_seed;
        runtime_session::set(session);

        if constexpr (build_profile::production) {
            tls_gate::set_stage(1);
        }

        config::deserialize_from_json("{\"normal\":{},\"string_map\":{},\"dword_map\":{},\"vector3_map\":{}}");
        if (!preload_freecam_script()) {
            return false;
        }
        return true;
    }

    void initialize() {
        runtime_debug::last_section = "initialize_start";
        NOCTUA_RUNTIME_LOG("initialize started");

        NOCTUA_VMP_BEGIN_ULTRA("initialize.release_gate");
        if (!initialize_release_runtime()) {
            NOCTUA_VMP_END();
            return;
        }
        NOCTUA_VMP_END();
        if (!g_initialized) {
            g_initialized = true;
        }
        __try { runtime_debug::last_section = "config_load"; config::load(); }
        __except(EXCEPTION_EXECUTE_HANDLER) { NOCTUA_RUNTIME_LOG("SEH: config::load 0x%08X", GetExceptionCode()); }

        runtime_debug::last_section = "findAllPatterns";
        NOCTUA_RUNTIME_LOG("calling findAllPatterns...");
        if (pointers::findAllPatterns()) {
            runtime_debug::last_section = "hook_enable";
            NOCTUA_RUNTIME_LOG("calling hook::enable...");
            if (hook::enable()) {
                Game.running = true;
                NOCTUA_RUNTIME_LOG("hook::enable OK, Game.running=true");
                executor::start_early_monitoring();

                runtime_tasks::start_ws_server();
                __try { runtime_debug::last_section = "aimbot_init"; runtime_tasks::start_aimbot(); }
                __except(EXCEPTION_EXECUTE_HANDLER) { NOCTUA_RUNTIME_LOG("SEH: aimbot::init 0x%08X", GetExceptionCode()); }
            }
        }

        runtime_debug::last_section = "main_loop";
        NOCTUA_RUNTIME_LOG("entering main loop");
        while (Game.running) {
            if (runtime_session::unload_requested()) {
                Game.running = false;
                break;
            }
            patch_wnd_proc();
            std::this_thread::sleep_for(500ms);
        }

        Game.running = false;

        NOCTUA_RUNTIME_LOG("shutdown: aimbot");
        __try { aimbot::shutdown(); } __except(EXCEPTION_EXECUTE_HANDLER) {}
        NOCTUA_RUNTIME_LOG("shutdown: unload scripts");
        __try { ws_server::unload_user_scripts_for_shutdown(); } __except(EXCEPTION_EXECUTE_HANDLER) {}
        NOCTUA_RUNTIME_LOG("shutdown: panic features");
        __try { hacks::disable_panic_features(); } __except(EXCEPTION_EXECUTE_HANDLER) {}
        NOCTUA_RUNTIME_LOG("shutdown: session clear");
        __try { runtime_session::clear(); } __except(EXCEPTION_EXECUTE_HANDLER) {}
        NOCTUA_RUNTIME_LOG("shutdown: game runtime");
        __try { game::shutdown_runtime(); } __except(EXCEPTION_EXECUTE_HANDLER) {}
        NOCTUA_RUNTIME_LOG("shutdown: executor");
        __try { executor::shutdown(); } __except(EXCEPTION_EXECUTE_HANDLER) {}
        NOCTUA_RUNTIME_LOG("shutdown: ws stop");
        __try { ws_server::stop(); } __except(EXCEPTION_EXECUTE_HANDLER) {}

        Sleep(1000);

        NOCTUA_RUNTIME_LOG("shutdown: hooks");
        __try { hook::disable(); } __except(EXCEPTION_EXECUTE_HANDLER) {}

        Sleep(500);

        NOCTUA_RUNTIME_LOG("shutdown: done");
    }
}

namespace runtime_init {
    DWORD __stdcall initialize_thread_proc(PVOID) {
        NOCTUA_VMP_BEGIN_ULTRA("initialize_thread_proc");
        crash_logger::install();
        __try {
            initialize();
        } __except(EXCEPTION_EXECUTE_HANDLER) {
            NOCTUA_RUNTIME_LOG("SEH: initialize top-level 0x%08X section=%s", GetExceptionCode(), runtime_debug::last_section);
        }
        NOCTUA_VMP_END();
        return 1;
    }
}
