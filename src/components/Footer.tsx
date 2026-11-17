import React, { useEffect, useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';

export const Footer: React.FC = () => {
  const [policyModal, setPolicyModal] = useState<'privacy' | 'security' | null>(null);

  useEffect(() => {
    if (!policyModal) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPolicyModal(null);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [policyModal]);

  return (
    <>
      <footer className="mt-16 border-t border-[#0d1b3e]/[0.07] bg-[#faf9f5]">
        <div className="mx-auto flex max-w-[1340px] flex-col items-start justify-between gap-4 px-5 py-8 sm:flex-row sm:items-center sm:px-8">
          <div className="flex flex-wrap items-center gap-2 text-sm text-[#45464e]">
            <span className="font-editorial text-[19px] font-medium text-[#0d1b3e]">NovaWorks</span>
            <span className="text-[#76767f]" aria-hidden="true">—</span>
            <span className="text-xs text-[#76767f]">Enterprise Workforce Intelligence</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-[#76767f]">
            <span className="text-[#45464e]">
              Orbital Engine v2.4
            </span>
            <button
              type="button"
              onClick={() => setPolicyModal('privacy')}
              className="hover:text-[#0d1b3e] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6344e7]"
            >
              Privacy Architecture
            </button>
            <button
              type="button"
              onClick={() => setPolicyModal('security')}
              className="hover:text-[#0d1b3e] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6344e7]"
            >
              Institutional Security
            </button>
          </div>
        </div>
      </footer>

      {policyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d1b3e]/35 p-4 backdrop-blur-xs"
          onClick={() => setPolicyModal(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-[#0d1b3e]/10 bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1edff] text-[#5b3bdf]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5b3bdf]">
                    Governance Brief
                  </p>
                  <h3 className="font-editorial text-2xl text-[#0d1b3e]">
                    {policyModal === 'privacy' ? 'Privacy Architecture' : 'Institutional Security'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPolicyModal(null)}
                aria-label="Close modal"
                className="rounded-full p-2 text-[#76767f] hover:bg-[#f5f4f0] hover:text-[#0d1b3e]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3 text-sm leading-relaxed text-[#45464e]">
              {policyModal === 'privacy' ? (
                <>
                  <p>
                    NovaWorks isolates client meeting transcripts inside ephemeral per-tenant enclaves.
                    No customer source notes or biometric metadata are retained for model training.
                  </p>
                  <p>
                    PII redaction executes prior to sprint synthesis, ensuring compliance with SOC2 Type II,
                    GDPR Article 28, and HIPAA BAA boundaries.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    All workspace sessions enforce hardware-backed token binding, zero-trust RBAC clearance
                    tiers, and immutable cryptographic audit logs for every sprint mutation.
                  </p>
                  <p>
                    Edge transport uses TLS 1.3 with mutual certificate pinning across EMEA, North America,
                    and APAC sovereign zones.
                  </p>
                </>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setPolicyModal(null)}
                className="rounded-full bg-[#0d1b3e] px-5 py-2 text-xs font-semibold text-white hover:bg-[#162756] transition-colors"
              >
                Close Brief
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
