#pragma once

#define NOCTUA_VMP_BEGIN(name) do { (void)(name); } while (0)
#define NOCTUA_VMP_BEGIN_MUTATION(name) do { (void)(name); } while (0)
#define NOCTUA_VMP_BEGIN_VIRTUALIZATION(name) do { (void)(name); } while (0)
#define NOCTUA_VMP_BEGIN_ULTRA(name) do { (void)(name); } while (0)
#define NOCTUA_VMP_END() do { } while (0)

#define NOCTUA_VMP_JOIN_IMPL(a, b) a##b
#define NOCTUA_VMP_JOIN(a, b) NOCTUA_VMP_JOIN_IMPL(a, b)
#define NOCTUA_VMP_SCOPE_MUTATION(name) NOCTUA_VMP_BEGIN_MUTATION(name); const vmp::scope_end NOCTUA_VMP_JOIN(noctua_vmp_scope_, __LINE__)
#define NOCTUA_VMP_SCOPE_VIRTUALIZATION(name) NOCTUA_VMP_BEGIN_VIRTUALIZATION(name); const vmp::scope_end NOCTUA_VMP_JOIN(noctua_vmp_scope_, __LINE__)
#define NOCTUA_VMP_SCOPE_ULTRA(name) NOCTUA_VMP_BEGIN_ULTRA(name); const vmp::scope_end NOCTUA_VMP_JOIN(noctua_vmp_scope_, __LINE__)

namespace vmp {
    class scope_end {
    public:
        scope_end() = default;
        ~scope_end() {
            NOCTUA_VMP_END();
        }

        scope_end(const scope_end&) = delete;
        scope_end& operator=(const scope_end&) = delete;
    };
}
