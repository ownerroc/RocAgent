import click
import httpx
from rich.console import Console
from rich.table import Table

API_URL = "http://localhost:8000"
console = Console()

@click.group()
def cli():
    """Skill Manager CLI"""
    pass

@click.command()
@click.option('--name', prompt='Skill name')
@click.option('--description', default='', help='Skill description')
@click.option('--category', default='general', help='Skill category')
@click.option('--difficulty', type=click.IntRange(1,5), default=3, help='Difficulty level 1-5')
def create(name, description, category, difficulty):
    """Create a new skill"""
    payload = {
        "name": name,
        "description": description,
        "category": category,
        "difficulty_level": difficulty,
    }
    try:
        resp = httpx.post(f"{API_URL}/skills", json=payload)
        resp.raise_for_status()
        skill = resp.json()
        console.print(f"[green]Created skill:[/green] {skill['skill_id']}")
    except Exception as e:
        console.print(f"[red]Error:[/red] {e}")

@click.command()
def list():
    """List all skills"""
    try:
        resp = httpx.get(f"{API_URL}/skills")
        resp.raise_for_status()
        skills = resp.json()
        table = Table(title="Skills")
        table.add_column("ID")
        table.add_column("Name")
        table.add_column("Category")
        table.add_column("Difficulty")
        for s in skills:
            table.add_row(s["skill_id"], s["name"], s["category"], str(s["difficulty_level"]))
        console.print(table)
    except Exception as e:
        console.print(f"[red]Error:[/red] {e}")

cli.add_command(create)
cli.add_command(list, name='list')

if __name__ == '__main__':
    cli()
