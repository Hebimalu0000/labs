<script>
	import "@oddbird/popover-polyfill"; // https://caniuse.com/mdn-api_htmlelement_popover

	import LogotypeItem from "./items/Logotype.svelte";
	import DropdownItem from "./items/Dropdown.svelte";

	import BigIconItem from "./popover/BigIcon.svelte";

	import SelectMenu from "./SelectMenu.svelte";

	import CheerpLogo from "./logos/cheerp.svg.svelte";
	import CheerpJLogo from "./logos/cheerpj.svg.svelte";
	import CheerpXLogo from "./logos/cheerpx.svg.svelte";

	const mobileMenu = {
		Technology: [
			{
				href: "https://cheerp.io/",
				title: "Cheerp",
			},
			{
				href: "https://cheerpj.com/",
				title: "CheerpJ",
			},
			{
				href: "https://cheerpx.io/",
				title: "CheerpX",
			},
		],
		Resources: [
			{
				href: "https://github.com/leaningtech",
				title: "GitHub | 本家",
			},
			{
				href: "https://github.com/leaningtech",
				title: "GitHub | このサイト版",
			},
		],
	};
</script>

<nav aria-label="Primary" class="navbar">
	<ul class="items">
		<LogotypeItem />
	</ul>
	<ul class="items desktop-only">
		<DropdownItem title="Technology" popovertarget="global-navbar-technology" />
		<DropdownItem title="Resources" popovertarget="global-navbar-resources" />
	</ul>
	<ul class="items mobile-only">
		<DropdownItem title="Leaning Technologies" />
		<SelectMenu menu={mobileMenu} />
	</ul>
</nav>

<nav popover aria-label="Technology" id="global-navbar-technology">
	<ul>
		<BigIconItem
			href="https://cheerp.io/"
			title="Cheerp"
			description="C++ から Wasm/JS へのコンパイラ"
		>
			<CheerpLogo />
		</BigIconItem>
		<BigIconItem
			href="https://cheerpj.com/"
			title="CheerpJ"
			description="ブラウザ用の Java 実行環境"
		>
			<CheerpJLogo />
		</BigIconItem>
		<BigIconItem
			href="https://cheerpx.io/"
			title="CheerpX"
			description="Web 用の仮想マシン"
		>
			<CheerpXLogo />
		</BigIconItem>
	</ul>
</nav>

<nav popover aria-label="Resources" id="global-navbar-resources">
	<ul>
		<li>
			<a href="https://github.com/leaningtech"> GitHub | 本家 </a>
		</li>
		<li>
			<a href="https://github.com/Hebimalu0000/webvm"> GitHub | このサイト版 </a>
		</li>
	</ul>
</nav>

<style>
	.navbar {
		background: black;
		height: 2.5rem;
		border-bottom: 1px solid rgb(68 64 60);

		display: flex;
		justify-content: space-between;
	}

	.items {
		display: flex;
		height: 100%;
		align-items: center;

		padding: 0 1rem;
		margin: 0;
		list-style: none;

		gap: 1rem;

		position: relative; /* for .select */
	}

	#global-navbar-technology,
	#global-navbar-resources {
		position: absolute;

		background: linear-gradient(to bottom right, black, rgb(28, 25, 23));
		border: 1px solid rgb(41 37 36);
		border-radius: 12px;
		box-shadow: 0 2px 1rem rgba(0, 0, 0, 0.5);

		padding: 1.5rem;

		& ul {
			padding: 0;
			margin: 0;
			list-style: none;

			display: flex;
			flex-direction: column;
			gap: 0.5rem;

			& a {
				color: white;
				text-decoration: none;

				padding: 1rem;
				border-radius: 8px;

				&:has(svg) {
					display: grid;
					grid-template-rows: 1fr 1fr;
					grid-template-columns: 3rem 1fr;
					align-items: center;
					gap: 0.5rem;

					& svg {
						grid-row: span 2;
						width: 80%;
						height: 100%;
					}

					& span {
						color: rgb(168 162 158);
					}
				}
			}
		}
	}

	#global-navbar-technology {
		inset: 3rem 6rem auto auto;
	}

	#global-navbar-resources {
		inset: 3rem 3rem auto auto;
	}

	@media (max-width: 768px) {
		.desktop-only {
			display: none !important;
		}
	}

	@media (min-width: 769px) {
		.mobile-only {
			display: none !important;
		}
	}
</style>
