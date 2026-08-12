#include "runtime/tasks.hpp"

#include "core/imports.h"
#include "features/misc/core.hpp"
#include "network/ws_bridge.hpp"
#include "platform/debug.hpp"

namespace runtime_tasks {
    void start_ws_server() {
        std::thread([]() {
            Sleep(3000);
            __try {
                runtime_debug::last_section = "ws_server_start";
                ws_server::start(8080);
            } __except(EXCEPTION_EXECUTE_HANDLER) {
                NOCTUA_RUNTIME_LOG("SEH: ws_server::start 0x%08X", GetExceptionCode());
            }
        }).detach();
    }

    void start_aimbot() {
        aimbot::init();
    }
}
