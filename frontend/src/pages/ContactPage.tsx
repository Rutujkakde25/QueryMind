import { useState, type FormEvent } from "react";
import { submitContact } from "../lib/api";

type Status = "idle" | "submitting" | "success" | "error";

interface FieldErrors {
  name?: string;
  email?: string;
  message?: string;
}

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [sentAt, setSentAt] = useState<number | null>(null);

  function validate(): FieldErrors {
    const errs: FieldErrors = {};
    if (!name.trim()) errs.name = "Your name helps us reply properly.";
    if (!email.trim()) errs.email = "We need an email to write back to.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
      errs.email = "That email address doesn't look right.";
    if (message.trim().length < 10)
      errs.message = "Give us a little more detail — at least ten characters.";
    return errs;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setStatus("error");
      setError("Fix the highlighted fields and try again.");
      return;
    }

    setStatus("submitting");
    setError("");
    try {
      await submitContact({
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      });
      setStatus("success");
      setError("");
      setSentAt(Date.now());
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  }

  const fieldClass = (hasError: boolean) =>
    `field ${hasError ? "!border-danger" : ""}`;

  return (
    <div>
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
        <p className="font-mono text-[12px] uppercase tracking-widest text-mute">
          contact
        </p>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-ink sm:text-5xl">
          Talk to the humans.
        </h1>
        <p className="mt-4 max-w-lg text-[15.5px] leading-relaxed text-mute">
          Questions, feedback, or a gnarly database you want us to try — send a note and
          we'll get back to you within a day.
        </p>

        <div className="mt-10">
          {status === "success" ? (
            <div
              role="status"
              className="rounded-xl border border-amber/40 bg-amber/10 px-6 py-8 text-center"
            >
              <p className="font-mono text-[13px] text-amber">message queued ✓</p>
              <h2 className="mt-2 font-display text-2xl font-semibold text-ink">
                Thanks — we got it.
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-mute">
                Your message is on its way. We usually reply within a day — talk soon.
              </p>
              <button
                onClick={() => setStatus("idle")}
                className="btn btn-ghost mt-6 font-mono text-[12.5px]"
              >
                send another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="max-w-xl">
              <div className="space-y-4">
                <div>
                  <label htmlFor="contact-name" className="mb-1.5 block text-[12.5px] font-medium text-mute">
                    Name
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={fieldClass(Boolean(fieldErrors.name))}
                    placeholder="Ada Lovelace"
                  />
                  {fieldErrors.name && (
                    <p className="mt-1.5 font-mono text-[11.5px] text-danger">{fieldErrors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="contact-email" className="mb-1.5 block text-[12.5px] font-medium text-mute">
                    Email
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={fieldClass(Boolean(fieldErrors.email))}
                    placeholder="ada@example.com"
                  />
                  {fieldErrors.email && (
                    <p className="mt-1.5 font-mono text-[11.5px] text-danger">{fieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="contact-message" className="mb-1.5 block text-[12.5px] font-medium text-mute">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className={`${fieldClass(Boolean(fieldErrors.message))} resize-y`}
                    placeholder="We're trying to run queries against a 2TB warehouse with joins into Redshift…"
                  />
                  {fieldErrors.message && (
                    <p className="mt-1.5 font-mono text-[11.5px] text-danger">{fieldErrors.message}</p>
                  )}
                </div>
              </div>

              {error && (
                <p
                  role="alert"
                  className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3.5 py-2.5 font-mono text-[12.5px] text-danger"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="btn btn-primary mt-6 w-full sm:w-auto"
              >
                {status === "submitting" ? (
                  <>
                    <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-current" />
                    Sending…
                  </>
                ) : (
                  "Send message"
                )}
              </button>
            </form>
          )}

          {status !== "success" && sentAt && (
            <p className="mt-6 font-mono text-[11.5px] text-mute">
              last send: {new Date(sentAt).toLocaleTimeString()} ✓
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
