#pragma once

namespace hacks {
    inline native::type::ped local_ped_handle() {
        __try {
            if (!pointer_to_handle || !IsValidPtr(local.player)) {
                return 0;
            }

            return pointer_to_handle(reinterpret_cast<intptr_t>(local.player));
        }
        __except (EXCEPTION_EXECUTE_HANDLER) {
            return 0;
        }
    }
}
