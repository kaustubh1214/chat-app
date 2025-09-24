import { useState } from "react";

export default function ShareModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>Share</button>

      {isOpen && (
        <div className="modal">
          <p>Share this chat!</p>
          <button onClick={() => setIsOpen(false)}>Close</button>
        </div>
      )}
    </>
  );
}
