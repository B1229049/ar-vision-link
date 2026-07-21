import "../styles/ProfileImage.css";

function ProfileImage({ user, className = "" }) {
  const name = user?.name || user?.nickname || "U";
  const initial = name.trim().charAt(0).toUpperCase() || "U";

  return (
    <div className={`profile-image ${className}`}>
      {user?.profile_url ? (
        <img src={user.profile_url} alt={`${name} profile`} />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}

export default ProfileImage;
