#pragma once

namespace hacks {
    void hacks_tick();

    void game_tick() {
        const bool unsafe_mode = unsafe_mode_enabled();

        if (IsValidPtr(local.player)) {
            runtime_debug::last_section = "gt_hacks_freecam";
            Freecam();
        }

        if (IsValidPtr(local.player) && _SafeCheckPlayerAlive()) {
            if (unsafe_mode && bind_state::is_active(k_noclip_bind)) {
                runtime_debug::last_section = "gt_hacks_noclip";
                no_clip();
            }
            if (unsafe_mode && bind_state::is_active(k_veh_boost_bind)) {
                runtime_debug::last_section = "gt_hacks_veh_boost";
                veh_boost();
            }
            runtime_debug::last_section = "gt_hacks_fast_stop";
            do_veh_fast_stop(unsafe_mode && bind_state::is_active(k_veh_fast_stop_bind));

            {
                static bool was_skip_active = false;
                bool skip_active = unsafe_mode && bind_state::is_active(k_skip_anim_bind);
                if (skip_active && !was_skip_active) {
                    runtime_debug::last_section = "gt_hacks_skip_anim";
                    skip_anim();
                }
                was_skip_active = skip_active;
            }

            if (config::get("hacks", "no_collision_veh", 0) || was_no_veh_collision_set) {
                runtime_debug::last_section = "gt_hacks_no_collision_veh";
                do_veh_no_collision();
            }

            if (unsafe_mode && config::get("hacks", "clear_task_key", 0)) {
                int key = config::get("hacks", "clear_task_key_key_num", 0);
                const bool clear_down = bind_state::is_key_down(key);
                static bool old_state = false;
                if (clear_down && !old_state) {
                    const auto ped = local_ped_handle();
                    if (ped) {
                        runtime_debug::last_section = "gt_hacks_clear_task";
                        native::brain::clear_ped_tasks_immediately(ped);
                    }
                }
                old_state = clear_down;
            }
            if (unsafe_mode) {
                runtime_debug::last_section = "gt_hacks_clickwarp";
                ClickWarp::tick(bind_state::is_active(k_clickwarp_bind));
            }
            else {
                runtime_debug::last_section = "gt_hacks_clickwarp_reset";
                ClickWarp::reset();
            }

            runtime_debug::last_section = "gt_hacks_misc_tick";
            hacks_tick();
        }
        else {
            runtime_debug::last_section = "gt_hacks_clickwarp_reset";
            ClickWarp::reset();
        }
    }
}
