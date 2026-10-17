"""Create an admin user interactively or via CLI flags."""

import argparse
import getpass
import sys
import uuid

from database.postgres import SessionLocal
from dependencies import hash_password
from models.user import User, UserRole


def prompt_admin_details() -> tuple[str, str, str]:
    print("Create DocNest admin user")
    print("-" * 30)

    name = input("Name: ").strip()
    while not name:
        print("Name is required.")
        name = input("Name: ").strip()

    email = input("Email (used to log in): ").strip()
    while not email or "@" not in email:
        print("A valid email is required.")
        email = input("Email (used to log in): ").strip()

    password = getpass.getpass("Password: ")
    while len(password) < 8:
        print("Password must be at least 8 characters.")
        password = getpass.getpass("Password: ")

    confirm = getpass.getpass("Confirm password: ")
    while password != confirm:
        print("Passwords do not match.")
        password = getpass.getpass("Password: ")
        confirm = getpass.getpass("Confirm password: ")

    return name, email, password


def create_admin(name: str, email: str, password: str) -> int:
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"Error: user already exists with email {email}", file=sys.stderr)
            return 1

        user = User(
            id=uuid.uuid4(),
            name=name,
            email=email,
            password_hash=hash_password(password),
            role=UserRole.admin,
            is_verified=True,
        )
        db.add(user)
        db.commit()
        print(f"Admin user created: {email}")
        return 0
    finally:
        db.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a DocNest admin user")
    parser.add_argument("--name", help="Display name")
    parser.add_argument("--email", help="Login email")
    parser.add_argument("--password", help="Login password (min 8 characters)")
    parser.add_argument(
        "--interactive",
        action="store_true",
        help="Prompt for admin details (default when flags are omitted)",
    )
    args = parser.parse_args()

    if args.name and args.email and args.password:
        if len(args.password) < 8:
            print("Error: password must be at least 8 characters", file=sys.stderr)
            return 1
        return create_admin(args.name, args.email, args.password)

    name, email, password = prompt_admin_details()
    return create_admin(name, email, password)


if __name__ == "__main__":
    sys.exit(main())
