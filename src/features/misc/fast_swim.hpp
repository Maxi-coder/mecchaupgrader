#pragma once

namespace hacks {
    inline bool was_fast_swim_set = false;

    inline void disable_fast_swim() {
        if (!was_fast_swim_set) {
            return;
        }

        was_fast_swim_set = false;
        native::player::set_swim_multiplier_for_player(native::player::player_id(), 1.f);
    }

    inline void do_fast_swim() {
        if (local.player->IsInVehicle()) {
            return;
        }

        const bool enabled = unsafe_mode_enabled() && config::get("hacks", "fast_swim_enable", 0) != 0;
        const float speed = std::clamp(config::get("hacks", "fast_swim", 1.0f), 1.0f, 2.0f);

        if (enabled) {
            was_fast_swim_set = true;
            native::player::set_swim_multiplier_for_player(native::player::player_id(), speed);
            return;
        }

        if (was_fast_swim_set) {
            disable_fast_swim();
        }
    }
}
