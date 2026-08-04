import { useState } from "react";
import "../styles/ProfileImage.css";

function ProfileImage({ user, className = "" }) {
  const name = user?.name || user?.nickname || "U";
  const initial = name.trim().charAt(0).toUpperCase() || "U";
  const profileUrl = user?.profile_url || "";
  const [failedUrl, setFailedUrl] = useState("");

  return (
    <div className={`profile-image ${className}`}>
      {profileUrl && failedUrl !== profileUrl ? (
        <img
          src={profileUrl}
          alt={`${name} profile`}
          onError={() => setFailedUrl(profileUrl)}
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}

export default ProfileImage;
